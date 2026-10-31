import { describe, expect, it } from 'vitest'

import {
  computeForecast,
  defaultSafeMargin,
  forecastEndIso,
  type ForecastInput
} from './cashForecast'
import type { ForecastEvent } from './cashForecastEvents'
import { addDaysToIso, diffIsoDays, jalaliToIso } from '../utils/jalaliDate'

const today = jalaliToIso(1405, 8, 6)

const accounts = [
  { id: 'meli', title: 'ملی', balance: 60_000_000 },
  { id: 'cash', title: 'نقدی', balance: 4_000_000 },
  { id: 'mellat', title: 'ملت', balance: 70_000_000 }
]

function event(
  id: string,
  offset: number,
  amount: number,
  extra: Partial<ForecastEvent> = {}
): ForecastEvent {
  return {
    id,
    kind: amount < 0 ? 'installment' : 'check',
    title: id,
    date: addDaysToIso(today, offset),
    amount,
    ...extra
  }
}

function input(over: Partial<ForecastInput> = {}): ForecastInput {
  return {
    todayIso: today,
    endIso: addDaysToIso(today, 10),
    accounts,
    excludedAccountIds: new Set(['mellat']),
    events: [],
    dailySpending: 0,
    ...over
  }
}

describe('computeForecast', () => {
  it('stays flat when nothing is known and nothing is spent', () => {
    const result = computeForecast(input())

    expect(result.days).toHaveLength(11)
    expect(result.startBalance).toBe(64_000_000)
    expect(result.endBalance).toBe(64_000_000)
    expect(result.lowest).toEqual({ date: today, balance: 64_000_000 })
    expect(result.firstNegativeDate).toBeNull()
  })

  it('applies the daily spending from tomorrow on, not today', () => {
    const result = computeForecast(input({ dailySpending: 1_000_000 }))

    expect(result.days[0].balance).toBe(64_000_000)
    expect(result.days[1].balance).toBe(63_000_000)
    expect(result.endBalance).toBe(54_000_000)
  })

  it('finds the lowest day and the first negative day after a big dip', () => {
    const result = computeForecast(
      input({
        events: [
          event('big-check', 3, -70_000_000),
          event('salary', 7, 65_000_000, { kind: 'recurring' })
        ]
      })
    )

    expect(result.lowest).toEqual({ date: addDaysToIso(today, 3), balance: -6_000_000 })
    expect(result.firstNegativeDate).toBe(addDaysToIso(today, 3))
    expect(result.days[2].state).toBe('ok')
    expect(result.days[3].state).toBe('negative')
    expect(result.endBalance).toBe(59_000_000)
  })

  it('marks days under the safe margin as tight', () => {
    const result = computeForecast(
      input({ events: [event('rent', 2, -62_000_000)], safeMargin: 5_000_000 })
    )

    expect(result.days[2].balance).toBe(2_000_000)
    expect(result.days[2].state).toBe('tight')
    expect(result.firstNegativeDate).toBeNull()
  })

  it('moves a received check later when it arrives late', () => {
    const received = event('received', 2, 30_000_000, { kind: 'check' })
    const bills = event('bills', 4, -80_000_000)

    const onTime = computeForecast(input({ events: [received, bills] }))
    const late = computeForecast(input({ events: [received, bills], incomingCheckDelayDays: 5 }))

    expect(onTime.lowest.balance).toBe(14_000_000)
    expect(late.lowest).toEqual({ date: addDaysToIso(today, 4), balance: -16_000_000 })
    expect(late.days[2].events).toHaveLength(0)
    expect(late.days[7].events.map(item => item.id)).toEqual(['received'])
    expect(late.endBalance).toBe(14_000_000)
  })

  it('does not delay money that is not a received check', () => {
    const salary = event('salary', 1, 10_000_000, { kind: 'recurring' })
    const result = computeForecast(input({ events: [salary], incomingCheckDelayDays: 5 }))

    expect(result.days[1].events).toHaveLength(1)
  })

  it('counts an installment due on the last day of the range, and drops one the day after', () => {
    const endIso = addDaysToIso(today, 5)
    const onEdge = event('edge', 5, -1_000_000)
    const after = event('after', 6, -9_000_000)

    const result = computeForecast(input({ endIso, events: [onEdge, after] }))

    expect(result.endBalance).toBe(63_000_000)
    expect(result.days.at(-1)?.events.map(item => item.id)).toEqual(['edge'])
  })

  it('leaves an excluded account out of the balance and its own events out of the days', () => {
    const fromMellat = event('rent', 1, -18_000_000, { accountId: 'mellat' })
    const fromMeli = event('bill', 1, -1_000_000, { accountId: 'meli' })
    const pooled = event('check', 1, -2_000_000)

    const result = computeForecast(input({ events: [fromMellat, fromMeli, pooled] }))

    expect(result.included.map(account => account.id)).toEqual(['meli', 'cash'])
    expect(result.excluded.map(account => account.id)).toEqual(['mellat'])
    expect(result.startBalance).toBe(64_000_000)
    expect(result.days[1].balance).toBe(61_000_000)
    expect(result.skippedEvents.map(item => item.id)).toEqual(['rent'])
  })

  it('counts every account when none is excluded', () => {
    const result = computeForecast(input({ excludedAccountIds: new Set() }))

    expect(result.startBalance).toBe(134_000_000)
    expect(result.excluded).toEqual([])
  })

  it('handles a huge daily spending by going negative at once and never recovering', () => {
    const result = computeForecast(input({ dailySpending: 50_000_000 }))

    expect(result.days[1].balance).toBe(14_000_000)
    expect(result.firstNegativeDate).toBe(addDaysToIso(today, 2))
    expect(result.lowest.date).toBe(result.days.at(-1)?.date)
    expect(result.endBalance).toBe(64_000_000 - 10 * 50_000_000)
  })

  it('treats a negative or broken daily spending as zero', () => {
    expect(computeForecast(input({ dailySpending: -5 })).endBalance).toBe(64_000_000)
    expect(computeForecast(input({ dailySpending: Number.NaN })).endBalance).toBe(64_000_000)
  })

  it('moves an event dated before today onto today', () => {
    const result = computeForecast(input({ events: [event('old', -3, -4_000_000)] }))

    expect(result.days[0].events.map(item => item.id)).toEqual(['old'])
    expect(result.days[0].balance).toBe(60_000_000)
  })

  it('returns a single day when the end is today', () => {
    const result = computeForecast(input({ endIso: today }))

    expect(result.days).toHaveLength(1)
    expect(result.endBalance).toBe(result.startBalance)
  })

  it('keeps cents out of the sums', () => {
    const result = computeForecast(input({ events: [event('a', 1, -0.1), event('b', 1, -0.2)] }))

    expect(result.days[1].balance).toBe(63_999_999.7)
  })
})

describe('defaultSafeMargin', () => {
  it('is a week of spending, or 5% of what is on hand when that is more', () => {
    expect(defaultSafeMargin(100_000_000, 1_000_000)).toBe(7_000_000)
    expect(defaultSafeMargin(100_000_000, 0)).toBe(5_000_000)
    expect(defaultSafeMargin(-5, 0)).toBe(0)
  })
})

describe('forecastEndIso', () => {
  it('ends the month view on the last day of a 31-day month', () => {
    expect(forecastEndIso(jalaliToIso(1405, 1, 10), 'month')).toBe(jalaliToIso(1405, 1, 31))
  })

  it('ends the month view on the 30th of a 30-day month', () => {
    expect(forecastEndIso(jalaliToIso(1405, 8, 6), 'month')).toBe(jalaliToIso(1405, 8, 30))
  })

  it('knows Esfand has 30 days in a leap year and 29 otherwise', () => {
    expect(forecastEndIso(jalaliToIso(1403, 12, 20), 'month')).toBe(jalaliToIso(1403, 12, 30))
    expect(forecastEndIso(jalaliToIso(1404, 12, 20), 'month')).toBe(jalaliToIso(1404, 12, 29))
    expect(diffIsoDays(jalaliToIso(1403, 12, 29), jalaliToIso(1403, 12, 30))).toBe(1)
  })

  it('counts the days of a month view across the year turn', () => {
    const start = jalaliToIso(1404, 12, 25)
    const result = computeForecast(
      input({ todayIso: start, endIso: forecastEndIso(start, 'month') })
    )

    expect(result.days).toHaveLength(5)
  })

  it('adds 30 or 60 days for the fixed views', () => {
    expect(forecastEndIso(today, 30)).toBe(addDaysToIso(today, 30))
    expect(forecastEndIso(today, 60)).toBe(addDaysToIso(today, 60))
  })
})
