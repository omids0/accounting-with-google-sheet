import type { AppSettings, DashboardData, NetAvailableConfig } from '../types'
import { assembleDashboardData, getDashboardBundle } from './dashboardBundle'
import {
  DASHBOARD_CACHE_TTL_MS,
  buildDashboardCacheKey,
  dashboardCache,
  dashboardInFlight,
  invalidateDashboardCache
} from './dashboardCache'
import { applyNetAvailableConfig } from './dashboardNetAvailable'
import { getDefaultNetAvailableConfig } from './settings'
import type { DateRange } from '../utils/dateRange'
import { getJalaliParts } from '../utils/jalaliDate'

export { applyNetAvailableConfig, invalidateDashboardCache }

export async function loadDashboardData(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange = range,
  monthlyFlowYear: number = getJalaliParts(new Date()).year,
  netAvailableConfig: NetAvailableConfig = getDefaultNetAvailableConfig()
): Promise<DashboardData> {
  const cacheKey = buildDashboardCacheKey(
    settings,
    range,
    installmentRange,
    monthlyFlowYear,
    netAvailableConfig
  )

  const cached = dashboardCache.get(cacheKey)

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  const inFlight = dashboardInFlight.get(cacheKey)

  if (inFlight) return inFlight

  const task = getDashboardBundle(settings, range, installmentRange, netAvailableConfig)
    .then(bundle => {
      const data = assembleDashboardData(bundle, monthlyFlowYear)

      dashboardCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS
      })

      return data
    })
    .finally(() => {
      dashboardInFlight.delete(cacheKey)
    })

  dashboardInFlight.set(cacheKey, task)

  return task
}

export function peekCachedDashboardData(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange = range,
  monthlyFlowYear: number = getJalaliParts(new Date()).year,
  netAvailableConfig: NetAvailableConfig = getDefaultNetAvailableConfig()
): DashboardData | null {
  const cacheKey = buildDashboardCacheKey(
    settings,
    range,
    installmentRange,
    monthlyFlowYear,
    netAvailableConfig
  )

  const cached = dashboardCache.get(cacheKey)

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  return null
}
