import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { loadChartsData, type ChartsData, type ChartsPeriod } from '../../services/chartsData'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth } from '../../utils/authGuard'
import { getJalaliMonthKey } from '../../utils/dateRange'
import { getJalaliParts, getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'

export function currentChartsPeriod(mode: ChartsPeriod['mode']): ChartsPeriod {
  return mode === 'year'
    ? { mode, key: String(getJalaliParts(new Date()).year) }
    : { mode, key: getJalaliMonthKey(getTodayIso()) }
}

export function useChartsPage() {
  const [period, setPeriod] = useState<ChartsPeriod>(() => currentChartsPeriod('month'))
  const [data, setData] = useState<ChartsData | null>(null)
  const [loading, setLoading] = useState(true)
  const dataRevision = useDataRefresh()

  const load = useCallback(async () => {
    const settings = getSettings()

    if (!isConfigured() || !requireAuth() || !settings) return

    setLoading(true)
    try {
      setData(await loadChartsData(settings, period))
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری نمودارها' })
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    load()
  }, [load, dataRevision])

  const setMode = (mode: ChartsPeriod['mode']) => {
    if (mode !== period.mode) setPeriod(currentChartsPeriod(mode))
  }

  return { period, setPeriod, setMode, data, loading }
}
