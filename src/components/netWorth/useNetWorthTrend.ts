import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import type { NetWorthTrend } from '../../services/netWorthTrend'
import { loadNetWorthTrend } from '../../services/netWorthTrendLoad'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'

/** Loads the «دارایی خالص» view and follows data changes; `selected` is the shown month. */
export function useNetWorthTrend() {
  const [trend, setTrend] = useState<NetWorthTrend | null>(null)
  const [selected, setSelected] = useState('')
  const dataRevision = useDataRefresh()

  const load = useCallback(async () => {
    const settings = getSettings()

    if (!isConfigured() || !requireAuth() || !settings) return

    try {
      setTrend(await loadNetWorthTrend(settings))
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری روند دارایی' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, dataRevision])

  const points = trend?.points ?? []
  const shown = points.some(point => point.monthKey === selected)
    ? selected
    : points[points.length - 1]?.monthKey ?? ''

  return { trend, selected: shown, setSelected, reload: load }
}
