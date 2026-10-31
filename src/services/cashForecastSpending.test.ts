import { describe, expect, it } from 'vitest'

import { averageDailySpending, type SpendingRecord } from './cashForecastSpending'
import type { RecurringItem } from '../types'
import { addDaysToIso, jalaliToIso } from '../utils/jalaliDate'

const today = jalaliToIso(1405, 8, 9)
const day = (offset: number) => addDaysToIso(today, offset)

function record(id: string, offset: number, amount: number, extra: Partial<SpendingRecord> = {}) {
  return { id, date: day(offset), amount, title: `خرج ${id}`, category: 'خوراک', ...extra }
}

const rent: RecurringItem = {
  id: 'r1',
  createdAt: '',
  type: 'expense',
  category: 'اجاره',
  subCategory: '',
  accountId: '',
  amount: 18_000_000,
  title: 'اجاره',
  dayOfMonth: 1,
  mode: 'reminder',
  lastPosted: '',
  active: true
}

const options = { todayIso: today, recurring: [] as RecurringItem[], isLinked: () => false }

describe('averageDailySpending', () => {
  it('has nothing to average without expense records', () => {
    expect(averageDailySpending([], options)).toMatchObject({
      perDay: 0,
      enough: false,
      historyDays: 0,
      counted: 0
    })
  })

  it('divides by the days since the first record, today included', () => {
    const result = averageDailySpending(
      [record('a', -29, 10_000_000), record('b', -5, 20_000_000)],
      options
    )

    expect(result).toMatchObject({ historyDays: 30, enough: true, counted: 2 })
    expect(result.perDay).toBe(1_000_000)
  })

  it('caps the history at 90 days and ignores older records', () => {
    const result = averageDailySpending(
      [record('old', -200, 99_000_000), record('a', -89, 9_000_000)],
      options
    )

    expect(result.historyDays).toBe(90)
    expect(result.counted).toBe(1)
    expect(result.perDay).toBe(100_000)
  })

  it('leaves out records an installment, check or debt payment points at', () => {
    const result = averageDailySpending(
      [
        record('free', -19, 6_000_000),
        record('inst', -10, 3_100_000),
        record('chk', -3, 22_000_000)
      ],
      { ...options, isLinked: id => id === 'inst' || id === 'chk' }
    )

    expect(result).toMatchObject({ counted: 1, excludedLinked: 2, excludedRecurring: 0 })
    expect(result.perDay).toBe(300_000)
  })

  it('leaves out recurring posts and records that repeat an active recurring item', () => {
    const result = averageDailySpending(
      [
        record('free', -20, 2_100_000),
        record('posted', -15, 5_000_000),
        record('manual-rent', -10, 18_000_000, { title: 'اجاره', category: 'اجاره' })
      ],
      { ...options, recurring: [rent], postedByRecurring: new Set(['posted']) }
    )

    expect(result).toMatchObject({ counted: 1, excludedRecurring: 2 })
    expect(result.perDay).toBe(100_000)
  })

  it('does not treat an inactive recurring item as a match', () => {
    const result = averageDailySpending(
      [record('a', -20, 2_100_000, { title: 'اجاره', category: 'اجاره' })],
      { ...options, recurring: [{ ...rent, active: false }] }
    )

    expect(result.counted).toBe(1)
  })

  it('gives 0 and says not enough with fewer than 14 days of history', () => {
    const result = averageDailySpending(
      [record('a', -12, 5_000_000), record('b', -1, 5_000_000)],
      options
    )

    expect(result).toMatchObject({ enough: false, historyDays: 13, perDay: 0, counted: 2 })
  })

  it('counts exactly 14 days of history as enough', () => {
    const result = averageDailySpending([record('a', -13, 14_000_000)], options)

    expect(result).toMatchObject({ enough: true, historyDays: 14, perDay: 1_000_000 })
  })

  it('ignores zero amounts and records dated after today', () => {
    const result = averageDailySpending(
      [record('zero', -20, 0), record('future', 3, 9_000_000), record('a', -20, 2_100_000)],
      options
    )

    expect(result.counted).toBe(1)
  })
})
