import type { AppSettings, DashboardData, NetAvailableConfig } from '../types'
import { invalidateInstallmentsCache } from './installments'
import type { DateRange } from '../utils/dateRange'

export const DASHBOARD_CACHE_TTL_MS = 30_000

export const dashboardCache = new Map<string, { expiresAt: number; data: DashboardData }>()

export const dashboardInFlight = new Map<string, Promise<DashboardData>>()

export interface DashboardBundle {
  expiresAt: number
  incomeRecords: { values: Record<string, string> }[]
  expenseRecords: { values: Record<string, string> }[]
  incomeDateField: string
  expenseDateField: string
  data: Omit<DashboardData, 'yearlyMonthlyFlow'>
}

export const dashboardBundleCache = new Map<string, DashboardBundle>()

export const dashboardBundleInFlight = new Map<string, Promise<DashboardBundle>>()

export function buildDashboardBundleCacheKey(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange,
  netAvailableConfig: NetAvailableConfig
): string {
  return JSON.stringify({
    spreadsheetId: settings.spreadsheetId,
    range,
    installmentRange,
    netAvailableConfig
  })
}

export function buildDashboardCacheKey(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange,
  monthlyFlowYear: number,
  netAvailableConfig: NetAvailableConfig
): string {
  return JSON.stringify({
    spreadsheetId: settings.spreadsheetId,
    range,
    installmentRange,
    monthlyFlowYear,
    netAvailableConfig
  })
}

export function invalidateDashboardCache(spreadsheetId?: string): void {
  if (!spreadsheetId) {
    dashboardCache.clear()
    dashboardInFlight.clear()
    dashboardBundleCache.clear()
    dashboardBundleInFlight.clear()
    invalidateInstallmentsCache()

    return
  }

  for (const key of dashboardCache.keys()) {
    if (key.includes(spreadsheetId)) dashboardCache.delete(key)
  }
  for (const key of dashboardInFlight.keys()) {
    if (key.includes(spreadsheetId)) dashboardInFlight.delete(key)
  }
  for (const key of dashboardBundleCache.keys()) {
    if (key.includes(spreadsheetId)) dashboardBundleCache.delete(key)
  }
  for (const key of dashboardBundleInFlight.keys()) {
    if (key.includes(spreadsheetId)) dashboardBundleInFlight.delete(key)
  }
  invalidateInstallmentsCache(spreadsheetId)
}
