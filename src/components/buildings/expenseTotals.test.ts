import { describe, expect, it } from 'vitest'

import { expensesOfMonth, filterExpenses, nonFlowOfMonth, sumAmounts } from './expenseRows'
import { monthFlowOf } from '../../services/buildingDashboard'
import { expenseBreakdown } from '../../services/buildingExpenseMeta'
import { DEFAULT_MANAGED_LISTS } from '../../services/buildingLists'
import { monthRangeOf } from '../../services/buildingMonths'
import { periodFlow } from '../../services/buildingReports'
import type { RecordRow } from '../../types'

const { EXPENSE_KINDS: kinds, EXPENSE_PAYERS: payers } = DEFAULT_MANAGED_LISTS

const row = (title: string, amount: number, values: Record<string, string>): RecordRow => ({
  id: title,
  createdAt: '',
  values: { title, amount: String(amount), date: '2026-10-05', ...values }
})

// The dev building in Mehr 1405: two real expenses, the repayment of the manager and a bank fix.
const expenseRecords = [
  row('اصلاح موجودی · ملت', 50_000, { category: 'اصلاح موجودی' }),
  row('بدهی: خرید لامپ راه‌پله', 6_000_000, { category: 'انتقال', payer: 'fund' }),
  row('خرید لامپ راه‌پله', 6_000_000, {
    category: 'آسانسور',
    expenseKind: 'current',
    payer: 'manager'
  }),
  row('تعمیر موتور آسانسور', 3_000_000, {
    category: 'تعمیرات',
    expenseKind: 'capital',
    payer: 'fund'
  })
]

const month = '1405-07'

describe('building expense totals share one rule', () => {
  const ofMonth = expensesOfMonth(expenseRecords, 'date', month)

  const breakdown = expenseBreakdown(ofMonth, kinds, payers)

  it('keeps transfers and fund corrections out of the expenses page', () => {
    expect(ofMonth.map(record => record.id)).toEqual(['خرید لامپ راه‌پله', 'تعمیر موتور آسانسور'])
    expect(
      filterExpenses(expenseRecords, { month, chip: 'all', category: 'all' }, 'date')
    ).toHaveLength(2)
    expect(breakdown.total).toBe(9_000_000)
    expect(breakdown.byKind).toEqual([
      { value: 'current', label: 'جاری', amount: 6_000_000 },
      { value: 'capital', label: 'عمرانی', amount: 3_000_000 }
    ])
    expect(breakdown.byPayer).toEqual([
      { value: 'fund', label: 'صندوق', amount: 3_000_000 },
      { value: 'manager', label: 'مدیر', amount: 6_000_000 }
    ])
  })

  it('lists the transfer and the correction apart, with their total', () => {
    const tagged = expenseRecords.map(record => ({ ...record, formId: 'expense' }))

    const apart = nonFlowOfMonth(tagged, () => 'date', month)

    expect(apart.map(record => record.id)).toEqual([
      'اصلاح موجودی · ملت',
      'بدهی: خرید لامپ راه‌پله'
    ])
    expect(sumAmounts(apart)).toBe(6_050_000)
    expect(nonFlowOfMonth(tagged, () => 'date', '1405-06')).toEqual([])
  })

  it('also lists a correction written to the income form and a reconcile', () => {
    const records = [
      { ...row('اصلاح موجودی · ملت', 70_000, { category: 'اصلاح موجودی' }), formId: 'income' },
      { ...row('تطبیق پیامک', 30_000, { category: 'تطبیق' }), formId: 'expense' },
      { ...row('شارژ', 5_000_000, { category: 'شارژ ساختمان' }), formId: 'income' },
      ...expenseRecords.map(record => ({ ...record, formId: 'expense' }))
    ]

    const apart = nonFlowOfMonth(records, () => 'date', month)

    expect(apart).toHaveLength(4)
    expect(sumAmounts(apart)).toBe(6_150_000)
    // The expense list and its total do not change.
    expect(
      expenseBreakdown(
        expensesOfMonth(
          records.filter(record => record.formId === 'expense'),
          'date',
          month
        ),
        kinds,
        payers
      ).total
    ).toBe(9_000_000)
  })

  it('agrees with the dashboard card (total and count) and the reports', () => {
    const range = monthRangeOf(month)

    const flow = monthFlowOf({ records: [] }, { records: expenseRecords }, range)

    expect(flow.expense).toBe(breakdown.total)
    expect(flow.expenseCount).toBe(ofMonth.length)

    const report = periodFlow({ records: [] }, { records: expenseRecords }, range, kinds, payers)

    expect(report.expense).toBe(breakdown.total)
    expect(report.byCategory.reduce((sum, item) => sum + item.total, 0)).toBe(breakdown.total)
    expect(report.byKind).toEqual(breakdown.byKind)
  })
})
