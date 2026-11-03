import { budgetUsage, type BudgetUsage } from '../../services/budgets'
import { monthKeyOfIso, nextMonthKey, previousMonthKey } from '../../services/buildingMonths'
import { parseNumeric } from '../../utils/parseNumeric'
import { matchSearch } from '../../utils/search'
import { SUBCATEGORY_FIELD_ID } from '../form/fieldUtils'
import type { StoredRecord } from '../records/recordsUtils'

/**
 * The numbers of a parent's read-only view of a child's account, as pure functions over the
 * child's records (income and expense, newest first). The pages hold no arithmetic of their own.
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

/** The label of a record without a category. */
export const NO_CATEGORY = 'بدون دسته'

export function toChildEntries(records: readonly StoredRecord[]): ChildEntry[] {
  return records.flatMap(record => {
    if (record.formType !== 'income' && record.formType !== 'expense') return []

    const { values } = record
    const amount = Math.abs(parseNumeric(values.amount))
    const category = String(values.category ?? '').trim()

    return [
      {
        id: record.id,
        kind: record.formType,
        date: String(values.date ?? '').trim(),
        amount: Number.isFinite(amount) ? amount : 0,
        title: String(values.title ?? '').trim() || category || record.formName,
        category,
        subCategory: String(values[SUBCATEGORY_FIELD_ID] ?? '').trim(),
        record
      }
    ]
  })
}

export const inMonth = (entry: ChildEntry, month: string): boolean =>
  !!entry.date && monthKeyOfIso(entry.date) === month

export interface MonthSummary {
  income: number
  expense: number
  /** income - expense. */
  balance: number
  count: number
}

export function monthSummary(entries: readonly ChildEntry[], month: string): MonthSummary {
  let income = 0
  let expense = 0
  let count = 0

  for (const entry of entries) {
    if (!inMonth(entry, month)) continue
    count += 1
    if (entry.kind === 'income') income += entry.amount
    else expense += entry.amount
  }

  return { income, expense, balance: income - expense, count }
}

/** Income minus expense of a list of entries (the footer of the record list). */
export const entriesNet = (entries: readonly ChildEntry[]): number =>
  entries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : -entry.amount), 0)

export interface CategoryRow {
  category: string
  amount: number
  count: number
  /** 0-100, of the month's total of this kind. */
  share: number
  /** The monthly budget (expense categories only), when the child set one. */
  budget?: number
  usage?: BudgetUsage
}

/** The month's spending (or income) by category, biggest first. */
export function categoryBreakdown(
  entries: readonly ChildEntry[],
  month: string,
  kind: ChildKind
): CategoryRow[] {
  const sums = new Map<string, { amount: number; count: number }>()
  let total = 0

  for (const entry of entries) {
    if (entry.kind !== kind || !inMonth(entry, month)) continue

    const key = entry.category || NO_CATEGORY
    const sum = sums.get(key) ?? { amount: 0, count: 0 }

    sums.set(key, { amount: sum.amount + entry.amount, count: sum.count + 1 })
    total += entry.amount
  }

  return [...sums.entries()]
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      share: total > 0 ? (amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, 'fa'))
}

/**
 * The expense rows with the child's budgets: a row with a budget carries its usage, and a budgeted
 * category with no spending this month is listed too (spent 0), so the parent sees the whole plan.
 */
export function withBudgets(
  rows: readonly CategoryRow[],
  budgets: ReadonlyMap<string, number>
): CategoryRow[] {
  const known = new Set(rows.map(row => row.category))

  const budgeted = rows.map(row => {
    const budget = budgets.get(row.category)

    return budget ? { ...row, budget, usage: budgetUsage(row.amount, budget) } : row
  })

  const unspent = [...budgets.entries()]
    .filter(([category, budget]) => budget > 0 && !known.has(category))
    .map(([category, budget]) => ({
      category,
      amount: 0,
      count: 0,
      share: 0,
      budget,
      usage: budgetUsage(0, budget)
    }))
    .sort((a, b) => a.category.localeCompare(b.category, 'fa'))

  return [...budgeted, ...unspent]
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
  return entries.filter(
    entry =>
      (filter.kind === 'all' || entry.kind === filter.kind) &&
      (filter.month === null || inMonth(entry, filter.month)) &&
      (!filter.category || (entry.category || NO_CATEGORY) === filter.category) &&
      matchSearch(
        filter.query,
        entry.title,
        entry.category,
        entry.subCategory,
        entry.amount,
        ...Object.values(entry.record.values)
      )
  )
}

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
