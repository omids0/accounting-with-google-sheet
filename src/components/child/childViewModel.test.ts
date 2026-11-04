import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { forms, rec } from './childTestFixtures'
import {
  canStepForward,
  categoryBreakdown,
  categoryOptions,
  filterEntries,
  inMonth,
  monthSummary,
  netDirection,
  NO_CATEGORY,
  stepMonth,
  toChildEntries,
  withUnspentBudgets
} from './childViewModel'
import { sumByCategory } from '../../services/dashboardAggregation'
import type { CustomForm } from '../../types'

// Today is 2026-11-04 = 1405-08-13. 1405-07 (مهر) ran 2026-09-23 .. 2026-10-22 (past, whole);
// 1405-08 (آبان) began 2026-10-23 and is the current month (counted up to today only).
const TODAY = new Date('2026-11-04T12:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

const records = [
  rec('expense', { date: '2026-10-01', amount: '100000', category: 'خوراک', title: 'ناهار' }),
  rec('expense', { date: '2026-10-05', amount: '50000', category: 'خوراک', title: 'پیتزا' }),
  rec('expense', { date: '2026-10-06', amount: '30000', category: 'تفریح', title: 'سینما' }),
  rec('income', { date: '2026-10-02', amount: '400000', category: 'عیدی', title: 'پول توجیبی' }),
  rec('expense', { date: '2026-10-25', amount: '9000', category: '', title: 'آبنبات' }),
  rec('expense', { date: '', amount: '5', category: 'خوراک', title: 'بی‌تاریخ' })
]

const entries = toChildEntries(records, forms)

describe('toChildEntries', () => {
  it('keeps income and expense records with a number amount and a title', () => {
    expect(entries).toHaveLength(6)
    expect(entries[0]).toMatchObject({ kind: 'expense', amount: 100000, title: 'ناهار' })
  })

  it('falls back to the category, then the form name, for a missing title', () => {
    const [a, b] = toChildEntries(
      [
        rec('expense', { date: '2026-10-01', amount: '1', category: 'خوراک' }),
        rec('expense', { date: '2026-10-01', amount: '1' })
      ],
      forms
    )

    expect(a.title).toBe('خوراک')
    expect(b.title).toBe('هزینه')
  })

  it('skips records of other kinds', () => {
    expect(toChildEntries([{ ...rec('expense', {}), formType: 'checks' as never }], forms)).toEqual(
      []
    )
  })

  it('reads the amount like the records page and keeps a negative one negative', () => {
    const [entry] = toChildEntries(
      [rec('expense', { date: '2026-10-01', amount: '-250', category: 'خوراک' })],
      forms
    )

    expect(entry.amount).toBe(-250)
  })

  it("reads the date from the form's own date field", () => {
    const custom: CustomForm = {
      ...forms[1],
      fields: forms[1].fields.map(field => (field.id === 'date' ? { ...field, id: 'when' } : field))
    }

    const [entry] = toChildEntries(
      [rec('expense', { when: '2026-10-01', amount: '1' })],
      [custom, forms[0]]
    )

    expect(entry.date).toBe('2026-10-01')
  })
})

describe('inMonth and monthSummary', () => {
  it('sums a past month whole and nets income minus expense', () => {
    expect(monthSummary(entries, '1405-07')).toEqual({
      income: 400000,
      expense: 180000,
      balance: 220000,
      count: 4
    })
  })

  it('leaves out other months and undated rows', () => {
    expect(monthSummary(entries, '1405-08')).toMatchObject({ expense: 9000, count: 1 })
    expect(monthSummary(entries, '1400-01').count).toBe(0)
  })

  it('counts the current month up to today only, like the dashboard (a future-dated row is out)', () => {
    const future = toChildEntries(
      [
        rec('expense', { date: '2026-11-04', amount: '1000', category: 'خوراک' }),
        rec('expense', { date: '2026-11-05', amount: '70000', category: 'خوراک' }),
        rec('income', { date: '2026-11-20', amount: '500000', category: 'عیدی' })
      ],
      forms
    )

    expect(inMonth(future[0], '1405-08')).toBe(true)
    expect(inMonth(future[1], '1405-08')).toBe(false)
    expect(monthSummary(future, '1405-08')).toEqual({
      income: 0,
      expense: 1000,
      balance: -1000,
      count: 1
    })
    expect(categoryBreakdown(future, '1405-08', 'expense')).toEqual([
      { name: 'خوراک', total: 1000, share: 1 }
    ])
    expect(
      filterEntries(future, { month: '1405-08', kind: 'all', category: '', query: '' })
    ).toHaveLength(1)
  })
})

describe('netDirection', () => {
  it('has the three states of the records summary', () => {
    expect(netDirection(5)).toBe('positive')
    expect(netDirection(-5)).toBe('negative')
    expect(netDirection(0)).toBe('neutral')
  })
})

describe('categoryBreakdown', () => {
  it('groups the month by category, biggest first, with shares (0-1)', () => {
    const rows = categoryBreakdown(entries, '1405-07', 'expense')

    expect(rows.map(row => row.name)).toEqual(['خوراک', 'تفریح'])
    expect(rows[0]).toMatchObject({ total: 150000 })
    expect(Math.round(rows[0].share * 100)).toBe(83)
  })

  it('names a record without a category «سایر», as the personal pages do', () => {
    expect(categoryBreakdown(entries, '1405-08', 'expense')[0].name).toBe(NO_CATEGORY)
    expect(NO_CATEGORY).toBe(sumByCategory([{ values: { amount: '1' } }])[0].name)
  })

  it('drops a category whose total is not positive', () => {
    const rows = categoryBreakdown(
      toChildEntries(
        [
          rec('expense', { date: '2026-10-01', amount: '100', category: 'الف' }),
          rec('expense', { date: '2026-10-01', amount: '-100', category: 'ب' })
        ],
        forms
      ),
      '1405-07',
      'expense'
    )

    expect(rows.map(row => row.name)).toEqual(['الف'])
  })
})

describe('withUnspentBudgets', () => {
  const rows = categoryBreakdown(entries, '1405-07', 'expense')

  it('lists a budgeted category with no spending after the spent ones', () => {
    const result = withUnspentBudgets(
      rows,
      new Map([
        ['خوراک', 100000],
        ['پوشاک', 200000]
      ])
    )

    expect(result.map(row => row.name)).toEqual(['خوراک', 'تفریح', 'پوشاک'])
    expect(result[2]).toEqual({ name: 'پوشاک', total: 0, share: 0 })
  })
})

describe('filterEntries', () => {
  const base = { month: null, kind: 'all', category: '', query: '' } as const

  it('filters by month, kind and category', () => {
    expect(filterEntries(entries, { ...base, month: '1405-07' })).toHaveLength(4)
    expect(filterEntries(entries, { ...base, kind: 'income' })).toHaveLength(1)
    expect(filterEntries(entries, { ...base, category: 'خوراک' })).toHaveLength(3)
    expect(filterEntries(entries, { ...base, category: NO_CATEGORY })).toHaveLength(1)
  })

  it('searches the title, category and amount (Persian digits too)', () => {
    expect(filterEntries(entries, { ...base, query: 'سینما' })).toHaveLength(1)
    expect(filterEntries(entries, { ...base, query: 'تفریح' })).toHaveLength(1)
    expect(filterEntries(entries, { ...base, query: '۳۰۰۰۰' })).toHaveLength(1)
  })

  it('does not search raw ids or other hidden columns', () => {
    const hidden = toChildEntries(
      [rec('expense', { date: '2026-10-01', amount: '5', note: 'پنهان‌شده' })],
      forms
    )

    expect(filterEntries(hidden, { ...base, query: 'پنهان' })).toHaveLength(0)
    expect(filterEntries(hidden, { ...base, query: hidden[0].id })).toHaveLength(0)
  })
})

describe('categoryOptions and month stepping', () => {
  it('lists each category the records use once', () => {
    const options = categoryOptions(entries)

    expect(options).toHaveLength(4)
    expect(options).toEqual(expect.arrayContaining([NO_CATEGORY, 'تفریح', 'خوراک', 'عیدی']))
  })

  it('steps a month back and forth and stops at the current one', () => {
    expect(stepMonth('1405-01', -1)).toBe('1404-12')
    expect(stepMonth('1405-12', 1)).toBe('1406-01')
    expect(canStepForward('1405-07', '1405-07')).toBe(false)
    expect(canStepForward('1405-06', '1405-07')).toBe(true)
  })
})
