import { describe, expect, it } from 'vitest'

import { ALL_CATEGORIES, expenseChips, expenseMonths, filterExpenses } from './expenseRows'
import { expenseBreakdown, describeBuildingExpense } from '../../services/buildingExpenseMeta'
import { DEFAULT_MANAGED_LISTS } from '../../services/buildingLists'

const kinds = DEFAULT_MANAGED_LISTS.EXPENSE_KINDS

const payers = DEFAULT_MANAGED_LISTS.EXPENSE_PAYERS

const rec = (values: Record<string, string>) => ({ values })

// 1405-07 = 2026-09-23 … 2026-10-22.
const records = [
  rec({
    date: '2026-10-05',
    amount: '2400000',
    category: 'آسانسور',
    expenseKind: 'current',
    payer: 'manager'
  }),
  rec({
    date: '2026-10-06',
    amount: '1100000',
    category: 'قبوض مشاعات',
    expenseKind: 'current',
    payer: 'fund'
  }),
  rec({
    date: '2026-10-08',
    amount: '5400000',
    category: 'تعمیرات',
    expenseKind: 'capital',
    payer: 'fund'
  }),
  rec({ date: '2026-09-01', amount: '700000', category: 'نظافت', expenseKind: 'current' })
]

describe('expense months and chips', () => {
  it('lists the months of the records and always the current one, newest first', () => {
    expect(expenseMonths(records, 'date', '1405-08')).toEqual(['1405-08', '1405-07', '1405-06'])
    expect(expenseMonths([], 'date', '1405-07')).toEqual(['1405-07'])
  })

  it('offers all, each visible kind and the manager chip', () => {
    expect(expenseChips([...kinds, { value: 'old', label: 'قدیمی', hidden: true }])).toEqual([
      { value: 'all', label: 'همه' },
      { value: 'kind:current', label: 'جاری' },
      { value: 'kind:capital', label: 'عمرانی' },
      { value: 'manager', label: 'از جیب مدیر' }
    ])
  })
})

describe('filterExpenses', () => {
  const base = { month: '1405-07', chip: 'all' as const, category: ALL_CATEGORIES }

  it('keeps the month and filters by kind, by the manager chip and by category', () => {
    expect(filterExpenses(records, base, 'date')).toHaveLength(3)
    expect(filterExpenses(records, { ...base, chip: 'kind:capital' }, 'date')).toHaveLength(1)
    expect(filterExpenses(records, { ...base, chip: 'manager' }, 'date')).toHaveLength(1)
    expect(filterExpenses(records, { ...base, category: 'تعمیرات' }, 'date')).toHaveLength(1)
    expect(filterExpenses(records, { ...base, month: '1405-06' }, 'date')).toHaveLength(1)
  })
})

describe('expense meta', () => {
  it('totals a month by kind and by payer (a record without a payer is the fund)', () => {
    const breakdown = expenseBreakdown(records.slice(0, 3), kinds, payers)

    expect(breakdown.total).toBe(8_900_000)
    expect(breakdown.byKind).toEqual([
      { value: 'current', label: 'جاری', amount: 3_500_000 },
      { value: 'capital', label: 'عمرانی', amount: 5_400_000 }
    ])
    expect(breakdown.byPayer).toEqual([
      { value: 'fund', label: 'صندوق', amount: 6_500_000 },
      { value: 'manager', label: 'مدیر', amount: 2_400_000 }
    ])
  })

  it('describes a row: kind, who paid and the number of shares', () => {
    const split = JSON.stringify({ mode: 'equal', shares: { u1: 1, u2: 1 }, charge: true })

    expect(describeBuildingExpense({ expenseKind: 'capital', payer: 'manager', split })).toBe(
      'عمرانی · از مدیر · تقسیم‌شده (۲ سهم)'
    )
    expect(describeBuildingExpense({ expenseKind: 'current', payer: 'fund' })).toBe(
      'جاری · از صندوق'
    )
  })
})
