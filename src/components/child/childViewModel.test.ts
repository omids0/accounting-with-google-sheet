import { describe, expect, it } from 'vitest'

import {
  canStepForward,
  categoryBreakdown,
  categoryOptions,
  entriesNet,
  filterEntries,
  monthSummary,
  NO_CATEGORY,
  stepMonth,
  toChildEntries,
  withBudgets
} from './childViewModel'
import type { StoredRecord } from '../records/recordsUtils'

let seq = 0

function rec(
  formType: 'income' | 'expense',
  values: Record<string, string>,
  formName = formType === 'income' ? 'درآمد' : 'هزینه'
): StoredRecord {
  seq += 1

  return {
    id: 'r' + seq,
    createdAt: '',
    rowNumber: seq + 1,
    values,
    formId: formType,
    formType,
    formName
  }
}

// 1405-07 (مهر) runs 2026-09-23 .. 2026-10-22; 1405-08 (آبان) starts 2026-10-23.
const records = [
  rec('expense', { date: '2026-10-01', amount: '100000', category: 'خوراک', title: 'ناهار' }),
  rec('expense', { date: '2026-10-05', amount: '50000', category: 'خوراک', title: 'پیتزا' }),
  rec('expense', { date: '2026-10-06', amount: '30000', category: 'تفریح', title: 'سینما' }),
  rec('income', { date: '2026-10-02', amount: '400000', category: 'عیدی', title: 'پول توجیبی' }),
  rec('expense', { date: '2026-10-25', amount: '9000', category: '', title: 'آبنبات' }),
  rec('expense', { date: '', amount: '5', category: 'خوراک', title: 'بی‌تاریخ' })
]

const entries = toChildEntries(records)

describe('toChildEntries', () => {
  it('keeps income and expense records with a number amount and a title', () => {
    expect(entries).toHaveLength(6)
    expect(entries[0]).toMatchObject({ kind: 'expense', amount: 100000, title: 'ناهار' })
  })

  it('falls back to the category, then the form name, for a missing title', () => {
    const [a, b] = toChildEntries([
      rec('expense', { date: '2026-10-01', amount: '1', category: 'خوراک' }),
      rec('expense', { date: '2026-10-01', amount: '1' })
    ])

    expect(a.title).toBe('خوراک')
    expect(b.title).toBe('هزینه')
  })

  it('skips records of other kinds', () => {
    expect(toChildEntries([{ ...rec('expense', {}), formType: 'checks' as never }])).toEqual([])
  })
})

describe('monthSummary', () => {
  it('sums the month and nets income minus expense', () => {
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
})

describe('entriesNet', () => {
  it('is income minus expense of the list', () => {
    expect(entriesNet(entries.filter(entry => entry.date.startsWith('2026-10-0')))).toBe(220000)
    expect(entriesNet([])).toBe(0)
  })
})

describe('categoryBreakdown', () => {
  it('groups the month by category, biggest first, with shares', () => {
    const rows = categoryBreakdown(entries, '1405-07', 'expense')

    expect(rows.map(row => row.category)).toEqual(['خوراک', 'تفریح'])
    expect(rows[0]).toMatchObject({ amount: 150000, count: 2 })
    expect(Math.round(rows[0].share)).toBe(83)
  })

  it('names a record without a category', () => {
    expect(categoryBreakdown(entries, '1405-08', 'expense')[0].category).toBe(NO_CATEGORY)
  })
})

describe('withBudgets', () => {
  const rows = categoryBreakdown(entries, '1405-07', 'expense')

  it('adds the usage to a budgeted row and lists a budgeted category with no spending', () => {
    const result = withBudgets(
      rows,
      new Map([
        ['خوراک', 100000],
        ['پوشاک', 200000]
      ])
    )

    expect(result.map(row => row.category)).toEqual(['خوراک', 'تفریح', 'پوشاک'])
    expect(result[0].usage?.over).toBe(true)
    expect(result[1].budget).toBeUndefined()
    expect(result[2]).toMatchObject({ amount: 0, budget: 200000 })
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
