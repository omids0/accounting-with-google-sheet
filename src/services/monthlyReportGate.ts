import { getItem, setItem } from './storage'
import { buildJalaliMonthKey, previousJalaliMonthKey } from '../utils/dateRange'
import { getJalaliParts } from '../utils/jalaliDate'

/** Per spreadsheet: `{ [spreadsheetId]: MonthlyReportState }`; wiped with the account. */
export const MONTHLY_REPORT_STORAGE_KEY = 'accounting_monthly_report_v1'

/** The dashboard row appears from this local hour on the first day of the month. */
export const MONTHLY_REPORT_HOUR = 9

export interface MonthlyReportState {
  /** Jalali `YYYY-MM` whose first-of-month row was viewed or closed. */
  handledMonth?: string
  /** Settings › «گزارش‌ها» › «گزارش ماهانه» off (or «هر ماه نفرست»). Default on. */
  off?: boolean
}

type MonthlyReportStore = Record<string, MonthlyReportState>

const listeners = new Set<() => void>()

export function subscribeMonthlyReport(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getMonthlyReportState(spreadsheetId: string): MonthlyReportState {
  return (getItem<MonthlyReportStore>(MONTHLY_REPORT_STORAGE_KEY) ?? {})[spreadsheetId] ?? {}
}

function patchState(spreadsheetId: string, patch: MonthlyReportState): void {
  const store = getItem<MonthlyReportStore>(MONTHLY_REPORT_STORAGE_KEY) ?? {}

  try {
    setItem(MONTHLY_REPORT_STORAGE_KEY, {
      ...store,
      [spreadsheetId]: { ...store[spreadsheetId], ...patch }
    })
  } catch {
    // Private mode: the row may show again; harmless.
  }
  listeners.forEach(listener => listener())
}

function currentMonthKey(now: Date): string {
  const { year, month } = getJalaliParts(now)

  return buildJalaliMonthKey(year, month)
}

/**
 * The month the dashboard row announces — the one that just ended — on the first
 * day of a Jalali month from 09:00, once per month; null otherwise or when off.
 */
export function monthlyReportDue(state: MonthlyReportState, now = new Date()): string | null {
  if (state.off) return null

  const { day } = getJalaliParts(now)

  if (day !== 1 || now.getHours() < MONTHLY_REPORT_HOUR) return null

  const monthKey = currentMonthKey(now)

  return state.handledMonth === monthKey ? null : previousJalaliMonthKey(monthKey)
}

/** «ببین» or ✕: the row stays away until next month. */
export function markMonthlyReportHandled(spreadsheetId: string, now = new Date()): void {
  patchState(spreadsheetId, { handledMonth: currentMonthKey(now) })
}

export function isMonthlyReportOn(spreadsheetId: string): boolean {
  return !getMonthlyReportState(spreadsheetId).off
}

export function setMonthlyReportOn(spreadsheetId: string, on: boolean): void {
  patchState(spreadsheetId, { off: !on })
}
