import { filterByDateRange } from './dashboardAggregation'
import type { CategoryBudget } from '../types'
import { getJalaliMonthRange, listRecentJalaliMonthKeys } from '../utils/dateRange'
import { parseNumeric } from '../utils/parseNumeric'

/** The digest warns once spending reaches this share of a budget. */
export const BUDGET_WARN_RATIO = 0.8

/** Months behind the suggestion «میانگین ۳ ماه اخیرت». */
export const BUDGET_AVERAGE_MONTHS = 3

export type BudgetLevel = 'ok' | 'warn' | 'over'

export interface BudgetUsage {
  /** spent / budget, uncapped. */
  ratio: number
  over: boolean
  overBy: number
  level: BudgetLevel
}

export function rowToBudget(row: string[]): CategoryBudget | null {
  const category = String(row[0] ?? '').trim()
  const amount = parseNumeric(row[1])

  if (!category || !(amount > 0)) return null

  return { category, amount, updatedAt: String(row[2] ?? '') }
}

export function budgetToRow(budget: CategoryBudget): string[] {
  return [budget.category, String(budget.amount), budget.updatedAt]
}

/** Category → monthly amount; a later row for the same category wins. */
export function budgetMap(budgets: CategoryBudget[]): Map<string, number> {
  return new Map(budgets.map(budget => [budget.category, budget.amount]))
}

export function budgetUsage(spent: number, budget: number): BudgetUsage {
  const ratio = budget > 0 ? spent / budget : 0
  const over = budget > 0 && spent > budget

  return {
    ratio,
    over,
    overBy: over ? spent - budget : 0,
    level: over ? 'over' : ratio >= BUDGET_WARN_RATIO ? 'warn' : 'ok'
  }
}

type SheetRecord = { values: Record<string, string> }

/**
 * Average monthly spend of `category` over the three months before `monthKey`,
 * rounded to the thousand. Months before the user's first expense do not count,
 * so a newcomer's suggestion is not diluted by empty months.
 */
export function threeMonthAverage(
  records: SheetRecord[],
  dateField: string,
  category: string,
  monthKey: string
): number {
  const keys = listRecentJalaliMonthKeys(monthKey, BUDGET_AVERAGE_MONTHS + 1).slice(0, -1)
  let total = 0
  let months = 0

  for (const key of keys) {
    const range = getJalaliMonthRange(key)

    if (!range) continue

    const inMonth = filterByDateRange(records, range, dateField)

    if (!inMonth.length) continue

    months += 1
    total += inMonth
      .filter(record => (record.values.category || 'سایر') === category)
      .reduce((sum, record) => sum + parseNumeric(record.values.amount), 0)
  }

  if (!months) return 0

  return Math.round(total / months / 1000) * 1000
}

/** `{ "1405-07|خوراک|warn": "2026-10-12" }`: the day each alert went into the digest. */
export type BudgetAlertLog = Record<string, string>

export interface BudgetAlertPick {
  /** Lines for tonight's digest. */
  lines: string[]
  /** The log to store: this month's keys only. */
  log: BudgetAlertLog
}

function alertKey(monthKey: string, category: string, level: 'warn' | 'over'): string {
  return `${monthKey}|${category}|${level}`
}

/**
 * Once per category per month for each of «۸۰٪» and «گذشت»: a crossing is logged
 * with today's date and stays in today's digest; later days skip it. Going straight
 * past the budget logs both, so the 80% line never follows the over line.
 */
export function pickBudgetAlerts(
  budgets: CategoryBudget[],
  spentByCategory: Map<string, number>,
  monthKey: string,
  todayIso: string,
  previous: BudgetAlertLog
): BudgetAlertPick {
  const log: BudgetAlertLog = {}

  for (const [key, day] of Object.entries(previous)) {
    if (key.startsWith(`${monthKey}|`)) log[key] = day
  }

  const lines: string[] = []

  for (const { category, amount } of budgets) {
    const { level } = budgetUsage(spentByCategory.get(category) ?? 0, amount)

    if (level === 'ok') continue

    const warnKey = alertKey(monthKey, category, 'warn')
    const overKey = alertKey(monthKey, category, 'over')

    if (level === 'over') {
      log[overKey] ??= todayIso
      log[warnKey] ??= todayIso
      if (log[overKey] === todayIso) lines.push(`${category} از بودجه گذشت`)
      continue
    }

    log[warnKey] ??= todayIso
    if (log[warnKey] === todayIso) lines.push(`${category} به ۸۰٪ بودجه رسید`)
  }

  return { lines, log }
}
