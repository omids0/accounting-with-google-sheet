import { filterByDateRange, sumByCategory } from './dashboardAggregation'
import type { CategorySummary, MonthComparison, PreviousMonthSummary } from '../types'
import {
  getJalaliMonthRange,
  parseJalaliMonthKey,
  previousJalaliMonthKey
} from '../utils/dateRange'
import { JALALI_MONTHS } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'

/** Within ±2% of last month reads as «مثل شهریور». */
export const SAME_MONTH_THRESHOLD = 0.02

type SheetRecord = { values: Record<string, string> }

export interface MonthRecords {
  incomeRecords: SheetRecord[]
  expenseRecords: SheetRecord[]
  incomeDateField: string
  expenseDateField: string
}

/** Change from `previous` to `current`; null when last month has nothing to compare with. */
export function compareMonths(current: number, previous: number): MonthComparison | null {
  if (!(previous > 0)) return null

  const change = (current - previous) / previous

  if (Math.abs(change) <= SAME_MONTH_THRESHOLD) return { trend: 'same', percent: 0 }

  return { trend: change > 0 ? 'up' : 'down', percent: Math.round(Math.abs(change) * 100) }
}

/**
 * Per category of the shown month: only categories that had at least one record
 * last month get a comparison.
 */
export function compareCategories(
  current: CategorySummary[],
  previous: CategorySummary[] | undefined
): Map<string, MonthComparison> {
  const result = new Map<string, MonthComparison>()

  if (!previous?.length) return result

  const before = new Map(previous.map(item => [item.name, item.total]))

  for (const item of current) {
    const comparison = compareMonths(item.total, before.get(item.name) ?? 0)

    if (comparison) result.set(item.name, comparison)
  }

  return result
}

/** Totals and categories of the month before `monthKey` (`1405-07` → شهریور). */
export function summarizePreviousMonth(
  records: MonthRecords,
  monthKey: string
): PreviousMonthSummary | undefined {
  const previousKey = previousJalaliMonthKey(monthKey)
  const range = getJalaliMonthRange(previousKey)
  const parts = parseJalaliMonthKey(previousKey)

  if (!range || !parts || previousKey === monthKey) return undefined

  const income = filterByDateRange(records.incomeRecords, range, records.incomeDateField)
  const expense = filterByDateRange(records.expenseRecords, range, records.expenseDateField)
  const total = (list: SheetRecord[]) =>
    list.reduce((sum, record) => sum + parseNumeric(record.values.amount), 0)

  return {
    monthName: JALALI_MONTHS[parts.month - 1] ?? '',
    totalIncome: total(income),
    totalExpense: total(expense),
    incomeByCategory: sumByCategory(income),
    expenseByCategory: sumByCategory(expense)
  }
}
