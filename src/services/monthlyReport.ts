import { budgetUsage } from './budgets'
import type { ChartsRecords } from './chartsData'
import { filterByDateRange, sumByCategory } from './dashboardAggregation'
import { monthHighlights, type MonthHighlights } from './monthlyReportHighlights'
import type { NetWorthSnapshot } from './netWorth'
import { isRecurringBorn } from './recurring'
import type { CategoryBudget, Check, InstallmentPlan } from '../types'
import {
  formatJalaliMonthLabel,
  formatJalaliYear,
  getJalaliMonthRange,
  isDateInRange,
  previousJalaliMonthKey,
  type DateRange
} from '../utils/dateRange'
import { normalizeDigits } from '../utils/normalizeDigits'
import { parseNumeric } from '../utils/parseNumeric'

/** One budgeted category in the month: spend against its monthly limit. */
export interface MonthlyReportBudget {
  category: string
  spent: number
  budget: number
  /** spent / budget, uncapped. */
  ratio: number
  over: boolean
}

/** Everything the one-page monthly report shows — and nothing else. */
export interface MonthlyReportData {
  monthKey: string
  income: number
  expense: number
  net: number
  budgets: MonthlyReportBudget[]
  installments: { paid: number; due: number }
  checksCleared: number
  /** End-of-month «دارایی قابل اتکا» (Task B snapshot); null when unknown. */
  netWorth: number | null
  /** Change from the previous month's snapshot; null without both values. */
  netWorthChange: number | null
  recurringPosted: number
  /** Where the month's spending went by counterparty and item; both empty when unknown. */
  highlights: MonthHighlights
}

export interface MonthlyReportInput {
  records: ChartsRecords
  budgets: CategoryBudget[]
  installmentPlans: InstallmentPlan[]
  checks: Check[]
  snapshots: NetWorthSnapshot[]
  /** Today's value: stands in for the month just ended before its snapshot is written. */
  todayNetWorth?: number | null
  /** The month before today's (the one the first-of-month card announces). */
  lastMonthKey?: string
}

type SheetRecord = { values: Record<string, string> }

function sumAmounts(records: SheetRecord[]): number {
  return records.reduce((sum, record) => sum + parseNumeric(record.values.amount), 0)
}

/** Installments due in `range`, and how many of them are paid («۳ از ۳»). */
export function installmentsDueIn(
  plans: InstallmentPlan[],
  range: DateRange
): { paid: number; due: number } {
  let paid = 0
  let due = 0

  for (const plan of plans) {
    for (const payment of plan.payments) {
      if (!isDateInRange(payment.dueDate, range)) continue
      due += 1
      if (payment.paid) paid += 1
    }
  }

  return { paid, due }
}

/** Installments paid inside `range` (by payment date, else due date). */
export function installmentsPaidIn(plans: InstallmentPlan[], range: DateRange): number {
  return plans.reduce(
    (count, plan) =>
      count +
      plan.payments.filter(
        payment => payment.paid && isDateInRange(payment.paidAt || payment.dueDate, range)
      ).length,
    0
  )
}

/** Checks marked paid inside `range` (by payment date, else due date). */
export function checksClearedIn(checks: Check[], range: DateRange): number {
  return checks.filter(check => check.paid && isDateInRange(check.paidAt || check.dueDate, range))
    .length
}

function snapshotValue(snapshots: NetWorthSnapshot[], monthKey: string): number | null {
  return snapshots.find(item => item.monthKey === monthKey)?.netWorth ?? null
}

/** Income, expense, budgets, counts and net worth of one Jalali month. */
export function buildMonthlyReport(monthKey: string, input: MonthlyReportInput): MonthlyReportData {
  const range = getJalaliMonthRange(monthKey) ?? { start: '', end: '' }
  const { records } = input
  const income = filterByDateRange(records.incomeRecords, range, records.incomeDateField)
  const expense = filterByDateRange(records.expenseRecords, range, records.expenseDateField)
  const totalIncome = sumAmounts(income)
  const totalExpense = sumAmounts(expense)
  const spent = new Map(sumByCategory(expense).map(item => [item.name, item.total]))

  const budgets = input.budgets
    .filter(budget => budget.amount > 0)
    .map(budget => {
      const amount = spent.get(budget.category) ?? 0
      const usage = budgetUsage(amount, budget.amount)

      return {
        category: budget.category,
        spent: amount,
        budget: budget.amount,
        ratio: usage.ratio,
        over: usage.over
      }
    })
    .sort((a, b) => b.ratio - a.ratio)

  const fallback = monthKey === input.lastMonthKey ? input.todayNetWorth ?? null : null
  const netWorth = snapshotValue(input.snapshots, monthKey) ?? fallback
  const previous = snapshotValue(input.snapshots, previousJalaliMonthKey(monthKey))

  return {
    monthKey,
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
    budgets,
    installments: installmentsDueIn(input.installmentPlans, range),
    checksCleared: checksClearedIn(input.checks, range),
    netWorth,
    netWorthChange: netWorth != null && previous != null ? netWorth - previous : null,
    recurringPosted: [...income, ...expense].filter(record => isRecurringBorn(record.values))
      .length,
    highlights: monthHighlights(expense)
  }
}

/** «حساب کتاب · مهر ۱۴۰۵» */
export function monthlyReportTitle(monthKey: string): string {
  const [name, year] = formatJalaliMonthLabel(monthKey).split(' ')
  return `حساب کتاب · ${name} ${formatJalaliYear(Number(normalizeDigits(year)))}`
}

/** «گزارش مهر ۱۴۰۵.pdf» */
export function monthlyReportFileName(monthKey: string): string {
  return `${monthlyReportTitle(monthKey).replace('حساب کتاب · ', 'گزارش ')}.pdf`
}
