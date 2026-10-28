import { budgetUsage } from './budgets'
import type { ChartsRecords } from './chartsData'
import { filterByDateRange, sumByCategory } from './dashboardAggregation'
import { monthHighlights, type MonthHighlights } from './monthlyReportHighlights'
import type { NetWorthSnapshot } from './netWorth'
import { netWorthAtMonthEnd, type NetWorthBasis } from './netWorthMonthEnd'
import { isRecurringBorn } from './recurring'
import type { CategoryBudget, Check, InstallmentPlan } from '../types'
import {
  formatJalaliMonthLabel,
  getJalaliMonthRange,
  isDateInRange,
  previousJalaliMonthKey,
  type DateRange
} from '../utils/dateRange'
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
  /** End-of-month «دارایی قابل اتکا»: the snapshot, else rebuilt from records, else today's. */
  netWorth: number | null
  /** Where `netWorth` comes from; null when it is unknown. */
  netWorthBasis: NetWorthBasis | null
  /** Change from the previous month-end; null without both values or when `netWorth` is today's. */
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
  /** Today's value: the last resort, flagged, for the month just ended when nothing else exists. */
  todayNetWorth?: number | null
  /** Month-end value rebuilt from records for a month without a snapshot (`monthEndNetWorthReader`). */
  rebuildNetWorth?: ((monthKey: string) => number | null) | null
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

  const source = {
    snapshots: input.snapshots,
    rebuild: input.rebuildNetWorth,
    todayNetWorth: input.todayNetWorth,
    lastMonthKey: input.lastMonthKey
  }
  const netWorth = netWorthAtMonthEnd(monthKey, source)
  // Today's value is no month-end, so it is never the base of a change either.
  const previous = netWorthAtMonthEnd(previousJalaliMonthKey(monthKey), {
    ...source,
    todayNetWorth: null
  })

  return {
    monthKey,
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
    budgets,
    installments: installmentsDueIn(input.installmentPlans, range),
    checksCleared: checksClearedIn(input.checks, range),
    netWorth: netWorth?.value ?? null,
    netWorthBasis: netWorth?.basis ?? null,
    netWorthChange:
      netWorth && netWorth.basis !== 'today' && previous ? netWorth.value - previous.value : null,
    recurringPosted: [...income, ...expense].filter(record => isRecurringBorn(record.values))
      .length,
    highlights: monthHighlights(expense)
  }
}

/**
 * Says where the net-worth figure comes from when it is not a stored snapshot: «تا پایان مهر ۱۴۰۵
 * (محاسبه‌شده)» for the rebuild from records, «ارزش امروز» when only today's value exists.
 */
export function monthlyReportNetWorthNote(
  report: Pick<MonthlyReportData, 'monthKey' | 'netWorthBasis'>
): string | null {
  if (report.netWorthBasis === 'rebuilt') {
    return `تا پایان ${formatJalaliMonthLabel(report.monthKey)} (محاسبه‌شده)`
  }

  return report.netWorthBasis === 'today' ? 'ارزش امروز' : null
}

/** «حساب کتاب · مهر ۱۴۰۵» */
export function monthlyReportTitle(monthKey: string): string {
  return `حساب کتاب · ${formatJalaliMonthLabel(monthKey)}`
}

/** «گزارش مهر ۱۴۰۵.pdf» */
export function monthlyReportFileName(monthKey: string): string {
  return `${monthlyReportTitle(monthKey).replace('حساب کتاب · ', 'گزارش ')}.pdf`
}
