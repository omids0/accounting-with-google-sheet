import type { ChartsRecords } from './chartsData'
import { filterByDateRange, sumByCategory } from './dashboardAggregation'
import { checksClearedIn, installmentsPaidIn } from './monthlyReport'
import type { NetWorthSnapshot } from './netWorth'
import { GOAL_LEDGER_SOURCE } from './savingsGoals'
import type { LedgerEntry } from './walletLedger'
import type { Check, InstallmentPlan, SavingsGoal } from '../types'
import { buildJalaliMonthKey, getJalaliMonthKey, isDateInRange } from '../utils/dateRange'
import { daysInJalaliMonth, jalaliToIso } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

/** «۱۴۰۵ در یک نگاه»: the headline numbers of one Jalali year. */
export interface YearReview {
  year: number
  income: number
  expense: number
  savings: number
  /** Whole percent of income saved; null without income. */
  savingsRate: number | null
  topExpenseCategory: string | null
  /** 1–12: the month with the largest expense; null without expenses. */
  topExpenseMonth: number | null
  netWorthFrom: number | null
  netWorthTo: number | null
  installmentsPaid: number
  checksCleared: number
  /** Titles of goals whose balance first reached the target during the year. */
  goalsReached: string[]
}

export interface YearReviewInput {
  records: ChartsRecords
  installmentPlans: InstallmentPlan[]
  checks: Check[]
  snapshots: NetWorthSnapshot[]
  goals: SavingsGoal[]
  ledger: LedgerEntry[]
  /** Today's value: the end of a year whose Esfand snapshot is not written yet. */
  todayNetWorth?: number | null
}

/** Savings as a whole percent of income, rounded half away from zero; null without income. */
export function savingsRate(income: number, expense: number): number | null {
  if (!(income > 0)) return null

  const percent = ((income - expense) / income) * 100

  return Math.sign(percent) * Math.round(Math.abs(percent)) || 0
}

export function jalaliYearRange(year: number): { start: string; end: string } {
  return { start: jalaliToIso(year, 1, 1), end: jalaliToIso(year, 12, daysInJalaliMonth(year, 12)) }
}

type SheetRecord = { values: Record<string, string> }

function sumAmounts(records: SheetRecord[]): number {
  return records.reduce((sum, record) => sum + parseNumeric(record.values.amount), 0)
}

/** 1–12 of the month with the largest total expense (the earlier month on a tie). */
export function mostExpensiveMonth(records: SheetRecord[], dateField: string): number | null {
  const totals = new Map<string, number>()

  for (const record of records) {
    const date = normalizeSheetDate(record.values[dateField] ?? '')

    if (!date) continue

    const key = getJalaliMonthKey(date)

    totals.set(key, (totals.get(key) ?? 0) + parseNumeric(record.values.amount))
  }

  let best: [string, number] | null = null

  for (const entry of [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (entry[1] > 0 && (!best || entry[1] > best[1])) best = entry
  }

  return best ? Number(best[0].slice(5)) : null
}

/** Goal id → the date its running balance first reached its target. */
export function goalReachDates(goals: SavingsGoal[], ledger: LedgerEntry[]): Map<string, string> {
  const targets = new Map(goals.filter(goal => goal.target > 0).map(goal => [goal.id, goal.target]))
  const entries = ledger
    .filter(entry => entry.source === GOAL_LEDGER_SOURCE && entry.recordId)
    .map(entry => ({ ...entry, date: normalizeSheetDate(entry.date) }))
    .filter(entry => entry.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const balances = new Map<string, number>()
  const reached = new Map<string, string>()

  for (const entry of entries) {
    const id = entry.recordId!
    const target = targets.get(id)

    // A deposit takes money out of a wallet account (negative delta).
    const balance = (balances.get(id) ?? 0) - entry.delta

    balances.set(id, balance)
    if (target && !reached.has(id) && balance >= target) reached.set(id, entry.date)
  }

  return reached
}

function snapshotOf(snapshots: NetWorthSnapshot[], monthKey: string): number | null {
  return snapshots.find(item => item.monthKey === monthKey)?.netWorth ?? null
}

/** Net worth at the end of last year → the end of this one (snapshots, then fallbacks). */
export function yearNetWorthSpan(
  year: number,
  snapshots: NetWorthSnapshot[],
  todayNetWorth?: number | null
): { from: number | null; to: number | null } {
  const inYear = snapshots
    .filter(item => item.monthKey.startsWith(`${year}-`))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  const from = snapshotOf(snapshots, buildJalaliMonthKey(year - 1, 12)) ?? inYear[0]?.netWorth
  const hasLaterYear = snapshots.some(item => item.monthKey > `${year}-12`)
  const to =
    snapshotOf(snapshots, buildJalaliMonthKey(year, 12)) ??
    (hasLaterYear ? null : todayNetWorth ?? null) ??
    inYear[inYear.length - 1]?.netWorth

  return { from: from ?? null, to: to ?? null }
}

export function buildYearReview(year: number, input: YearReviewInput): YearReview {
  const range = jalaliYearRange(year)
  const { records } = input
  const income = sumAmounts(
    filterByDateRange(records.incomeRecords, range, records.incomeDateField)
  )
  const expenseRecords = filterByDateRange(records.expenseRecords, range, records.expenseDateField)
  const expense = sumAmounts(expenseRecords)
  const reached = goalReachDates(input.goals, input.ledger)
  const span = yearNetWorthSpan(year, input.snapshots, input.todayNetWorth)

  return {
    year,
    income,
    expense,
    savings: income - expense,
    savingsRate: savingsRate(income, expense),
    topExpenseCategory: sumByCategory(expenseRecords).find(item => item.total > 0)?.name ?? null,
    topExpenseMonth: mostExpensiveMonth(expenseRecords, records.expenseDateField),
    netWorthFrom: span.from,
    netWorthTo: span.to,
    installmentsPaid: installmentsPaidIn(input.installmentPlans, range),
    checksCleared: checksClearedIn(input.checks, range),
    goalsReached: input.goals
      .filter(goal => {
        const date = reached.get(goal.id)

        return date ? isDateInRange(date, range) : false
      })
      .map(goal => goal.title)
  }
}

/** Whether the year has anything to show (a past year without records gets no card). */
export function hasYearActivity(review: YearReview): boolean {
  return review.income > 0 || review.expense > 0
}
