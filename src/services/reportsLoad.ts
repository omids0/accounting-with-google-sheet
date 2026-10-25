import { fetchBudgets } from './budgetsSheet'
import { withoutNonFlow } from './buildingDashboard'
import type { ChartsRecords } from './chartsData'
import { fetchChecks } from './checks'
import { fetchInstallmentPlans } from './installments'
import { buildMonthlyReport, type MonthlyReportData } from './monthlyReport'
import { fetchNetWorthSnapshots } from './netWorthSheet'
import { loadNetWorthRecords, loadTodayNetWorth } from './netWorthSources'
import { findEarliestRecordDate } from './openingBalanceDerive'
import { loadSavingsGoals } from './savingsGoalsSheet'
import { withoutSettlements } from './sharedSettlement'
import { WALLET_LEDGER_SHEET } from './sheetNames'
import { fetchSheetRows } from './sheets'
import { rowToLedgerEntry } from './walletLedger'
import { getActiveWorkspaceType } from './workspace'
import { buildYearReview, hasYearActivity, type YearReview } from './yearReview'
import { reviewableYears } from './yearReviewGate'
import type { AppSettings } from '../types'
import { getJalaliMonthKey, parseJalaliMonthKey, previousJalaliMonthKey } from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'

async function todayNetWorth(settings: AppSettings): Promise<number | null> {
  try {
    return (await loadTodayNetWorth(settings)).netWorth
  } catch {
    return null
  }
}

/** The data both reports share; a module that fails to load counts as empty. */
async function loadCommon(settings: AppSettings) {
  const id = settings.spreadsheetId
  const [records, installmentPlans, checks, snapshots, today] = await Promise.all([
    loadNetWorthRecords(settings),
    fetchInstallmentPlans(id).catch(() => []),
    fetchChecks(id).catch(() => []),
    fetchNetWorthSnapshots(id).catch(() => []),
    todayNetWorth(settings)
  ])

  const type = getActiveWorkspaceType()

  return {
    // A building's transfers and fund corrections, a shared account's «تسویه», are not flow.
    records: type === 'building' ? withoutNonFlow(records) : withoutSettlements(records, type),
    installmentPlans,
    checks,
    snapshots,
    todayNetWorth: today
  }
}

/** First Jalali month with a record, else null (the month picker starts there). */
export function firstRecordMonth(records: ChartsRecords): string | null {
  const earliest = findEarliestRecordDate(
    records.incomeRecords,
    records.expenseRecords,
    records.incomeDateField,
    records.expenseDateField
  )

  return earliest ? getJalaliMonthKey(earliest) : null
}

export interface MonthlyReportSource {
  build: (monthKey: string) => MonthlyReportData
  firstMonth: string | null
}

/** Loads once; `build` assembles any month's report from the loaded sheets. */
export async function loadMonthlyReportSource(settings: AppSettings): Promise<MonthlyReportSource> {
  const [common, budgets] = await Promise.all([
    loadCommon(settings),
    fetchBudgets(settings.spreadsheetId).catch(() => [])
  ])
  const lastMonthKey = previousJalaliMonthKey(getJalaliMonthKey(getTodayIso()))

  return {
    build: monthKey => buildMonthlyReport(monthKey, { ...common, budgets, lastMonthKey }),
    firstMonth: firstRecordMonth(common.records)
  }
}

async function loadGoalsAndLedger(spreadsheetId: string) {
  const [goals, ledgerRows] = await Promise.all([
    loadSavingsGoals(spreadsheetId).catch(() => []),
    fetchSheetRows(spreadsheetId, WALLET_LEDGER_SHEET).catch(() => [])
  ])

  return { goals, ledger: ledgerRows.map(rowToLedgerEntry) }
}

/** «سال در یک نگاه» of `years` (all reviewable years when omitted), newest first. */
export async function loadYearReviews(
  settings: AppSettings,
  years?: number[]
): Promise<YearReview[]> {
  const [common, goals] = await Promise.all([
    loadCommon(settings),
    loadGoalsAndLedger(settings.spreadsheetId)
  ])
  const today = getTodayIso()
  const first = firstRecordMonth(common.records)
  const list =
    years ?? reviewableYears(first ? parseJalaliMonthKey(first)?.year ?? null : null, today)

  return list
    .map(year => buildYearReview(year, { ...common, ...goals }))
    .filter(review => years || hasYearActivity(review))
}
