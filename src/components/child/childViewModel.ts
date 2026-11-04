import {
  monthKeyOfIso,
  monthRangeOf,
  nextMonthKey,
  previousMonthKey
} from '../../services/buildingMonths'
import { getDateFieldId, sumByCategory } from '../../services/dashboardAggregation'
import type { CategoryShare, CustomForm } from '../../types'
import { toCategoryShares } from '../../utils/categoryShares'
import { isDateInRange } from '../../utils/dateRange'
import { getTodayIso } from '../../utils/jalaliDate'
import { roundMoney } from '../../utils/roundMoney'
import { matchSearch } from '../../utils/search'
import { normalizeSheetDate } from '../../utils/sheetValues'
import { SUBCATEGORY_FIELD_ID } from '../form/fieldUtils'
import { getRecordAmount, type StoredRecord } from '../records/recordsUtils'

/**
 * The numbers of a parent's read-only view of a child's account, as pure functions over the
 * child's records (income and expense, newest first). The pages hold no arithmetic of their own,
 * and the figures are computed exactly like the personal pages (the dashboard's month-to-date and
 * `roundMoney` sums, `sumByCategory` + `toCategoryShares`, the records page's `getRecordAmount`),
 * so a parent comparing them with what the teenager sees finds the same numbers.
 */
export type ChildKind = 'income' | 'expense'

export interface ChildEntry {
  id: string
  kind: ChildKind
  /** ISO date, '' when the row has none (it belongs to no month). */
  date: string
  amount: number
  title: string
  category: string
  subCategory: string
  record: StoredRecord
}

/** The label of a record without a category: the one `sumByCategory` gives it. */
export const NO_CATEGORY = 'سایر'

export function toChildEntries(
  records: readonly StoredRecord[],
  forms: CustomForm[]
): ChildEntry[] {
  return records.flatMap(record => {
    if (record.formType !== 'income' && record.formType !== 'expense') return []

    const { values } = record
    const form = forms.find(item => item.id === record.formId)
    const category = String(values.category ?? '')

    return [
      {
        id: record.id,
        kind: record.formType,
        date: normalizeSheetDate(values[getDateFieldId(form)] ?? ''),
        amount: getRecordAmount(record, forms),
        title: String(values.title ?? '').trim() || category.trim() || record.formName,
        category,
        subCategory: String(values[SUBCATEGORY_FIELD_ID] ?? '').trim(),
        record
      }
    ]
  })
}

/**
 * Whether an entry falls in a Jalali month. The month of today counts only up to today
 * (month-to-date, like the personal dashboard); a past month counts whole.
 */
export function inMonth(entry: ChildEntry, month: string, todayIso = getTodayIso()): boolean {
  if (!entry.date) return false

  const range = monthRangeOf(month)

  return isDateInRange(entry.date, {
    start: range.start,
    end: monthKeyOfIso(todayIso) === month && todayIso < range.end ? todayIso : range.end
  })
}

export interface MonthSummary {
  income: number
  expense: number
  /** income - expense. */
  balance: number
  count: number
}

export function monthSummary(entries: readonly ChildEntry[], month: string): MonthSummary {
  const today = getTodayIso()
  let income = 0
  let expense = 0
  let count = 0

  for (const entry of entries) {
    if (!inMonth(entry, month, today)) continue
    count += 1
    if (entry.kind === 'income') income = roundMoney(income + entry.amount)
    else expense = roundMoney(expense + entry.amount)
  }

  return { income, expense, balance: roundMoney(income - expense), count }
}

/** Income minus expense of a list of entries (the footer of the record list). */
export const entriesNet = (entries: readonly ChildEntry[]): number =>
  roundMoney(
    entries.reduce(
      (sum, entry) => sum + (entry.kind === 'income' ? entry.amount : -entry.amount),
      0
    )
  )

/** The month's spending (or income) by category, biggest first, with each share (0-1). */
export function categoryBreakdown(
  entries: readonly ChildEntry[],
  month: string,
  kind: ChildKind
): CategoryShare[] {
  const today = getTodayIso()

  return toCategoryShares(
    sumByCategory(
      entries
        .filter(entry => entry.kind === kind && inMonth(entry, month, today))
        .map(entry => entry.record)
    )
  )
}

/**
 * The rows plus every budgeted category with no spending this month (spent 0), so the parent
 * sees the whole plan the child set.
 */
export function withUnspentBudgets(
  rows: readonly CategoryShare[],
  budgets: ReadonlyMap<string, number>
): CategoryShare[] {
  const known = new Set(rows.map(row => row.name))

  const unspent = [...budgets.entries()]
    .filter(([name, budget]) => budget > 0 && !known.has(name))
    .map(([name]) => ({ name, total: 0, share: 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'))

  return [...rows, ...unspent]
}

export interface ChildFilter {
  /** Jalali `YYYY-MM`; null = every month. */
  month: string | null
  kind: ChildKind | 'all'
  /** '' = every category. */
  category: string
  query: string
}

export function filterEntries(entries: readonly ChildEntry[], filter: ChildFilter): ChildEntry[] {
  const today = getTodayIso()

  return entries.filter(
    entry =>
      (filter.kind === 'all' || entry.kind === filter.kind) &&
      (filter.month === null || inMonth(entry, filter.month, today)) &&
      (!filter.category || (entry.category || NO_CATEGORY) === filter.category) &&
      matchSearch(filter.query, entry.title, entry.category, entry.subCategory, entry.amount)
  )
}

/** The direction of a net figure for a stat card: the records summary's three states. */
export const netDirection = (net: number): 'positive' | 'negative' | 'neutral' =>
  net < 0 ? 'negative' : net > 0 ? 'positive' : 'neutral'

/** The categories the child's records use, for the filter (the child's own category tab is not read). */
export function categoryOptions(entries: readonly ChildEntry[]): string[] {
  return [...new Set(entries.map(entry => entry.category || NO_CATEGORY))].sort((a, b) =>
    a.localeCompare(b, 'fa')
  )
}

/** Month stepping: never past `current`, the month of today. */
export const stepMonth = (month: string, direction: -1 | 1): string =>
  direction < 0 ? previousMonthKey(month) : nextMonthKey(month)

export const canStepForward = (month: string, current: string): boolean => month < current
