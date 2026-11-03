import { describe, expect, it } from 'vitest'

import type { ForecastInput } from './cashForecast'
import type { ForecastEvent } from './cashForecastEvents'
import { assessPurchase } from './cashForecastPurchase'
import { addDaysToIso, jalaliToIso } from '../utils/jalaliDate'

const today = jalaliToIso(1405, 8, 6)
const day = (offset: number) => addDaysToIso(today, offset)

function ev(id: string, offset: number, amount: number): ForecastEvent {
  return {
    id,
    kind: amount < 0 ? 'installment' : 'recurring',
    title: id,
    date: day(offset),
    amount
  }
}

function input(over: Partial<ForecastInput> = {}): ForecastInput {
  return {
    todayIso: today,
    endIso: day(20),
    accounts: [{ id: 'meli', title: 'ملی', balance: 20_000_000 }],
    events: [],
    dailySpending: 0,
    safeMargin: 2_000_000,
    ...over
  }
}

describe('assessPurchase', () => {
  it('has nothing to weigh for an amount of 0 or a broken one', () => {
    expect(assessPurchase(input(), { amount: 0 }).verdict).toBe('none')
    expect(assessPurchase(input(), { amount: Number.NaN }).verdict).toBe('none')
    expect(assessPurchase(input(), { amount: -5 }).verdict).toBe('none')
  })

  it('says ok when the lowest balance stays well above zero', () => {
    const result = assessPurchase(input(), { amount: 5_000_000 })

    expect(result).toMatchObject({ verdict: 'ok', shortfall: 0, alreadyShort: false })
    expect(result.lowest.balance).toBe(15_000_000)
    expect(result.baselineLowest.balance).toBe(20_000_000)
  })

  it('says tight when the lowest balance is above zero but under the margin', () => {
    const result = assessPurchase(input(), { amount: 19_000_000 })

    expect(result.verdict).toBe('tight')
    expect(result.lowest.balance).toBe(1_000_000)
  })

  it('says short with the shortfall and the day of the lowest balance', () => {
    const result = assessPurchase(input({ events: [ev('bill', 8, -3_000_000)] }), {
      amount: 19_000_000
    })

    expect(result.verdict).toBe('short')
    expect(result.shortfall).toBe(2_000_000)
    expect(result.lowest).toEqual({ date: day(8), balance: -2_000_000 })
  })

  it('suggests the earliest later day that really clears zero', () => {
    const result = assessPurchase(
      input({ events: [ev('bill', 3, -10_000_000), ev('salary', 9, 30_000_000)] }),
      { amount: 15_000_000 }
    )

    expect(result.verdict).toBe('short')
    expect(result.lowest.date).toBe(day(3))
    expect(result.suggestedDate).toBe(day(9))
  })

  it('does not suggest a day when waiting does not fix it', () => {
    const result = assessPurchase(input(), { amount: 25_000_000 })

    expect(result.verdict).toBe('short')
    expect(result.suggestedDate).toBeUndefined()
  })

  it('does not suggest a day when the days are short even without the purchase', () => {
    const result = assessPurchase(input({ events: [ev('big', 2, -30_000_000)] }), {
      amount: 1_000_000
    })

    expect(result).toMatchObject({ verdict: 'short', alreadyShort: true })
    expect(result.baselineLowest).toEqual({ date: day(2), balance: -10_000_000 })
    expect(result.lowest.balance).toBe(-11_000_000)
    expect(result.shortfall).toBe(11_000_000)
    expect(result.suggestedDate).toBeUndefined()
  })

  it('weighs the purchase on its own day', () => {
    const result = assessPurchase(
      input({ events: [ev('bill', 3, -10_000_000), ev('salary', 9, 30_000_000)] }),
      { amount: 15_000_000, date: day(10) }
    )

    expect(result.verdict).toBe('ok')
    expect(result.lowest).toEqual({ date: day(3), balance: 10_000_000 })
  })

  it('treats a date before today as today', () => {
    expect(assessPurchase(input(), { amount: 1, date: day(-4) }).date).toBe(today)
  })

  it('says out of range for a date after the last day covered', () => {
    expect(assessPurchase(input(), { amount: 1_000, date: day(21) }).verdict).toBe('out-of-range')
  })

  it('keeps the margin of the plain forecast when the purchase moves', () => {
    const base = input({ safeMargin: undefined, dailySpending: 100_000 })
    const early = assessPurchase(base, { amount: 1_000_000 })
    const later = assessPurchase(base, { amount: 1_000_000, date: day(5) })

    expect(early.safeMargin).toBe(later.safeMargin)
  })
})
