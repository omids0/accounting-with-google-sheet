import { useState, useEffect, useCallback } from 'react'

import type { PlanWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import {
  ensureInstallmentsSheet,
  fetchInstallmentPlans,
  INSTALLMENTS_SHEET
} from '../../services/installments'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData, getSheetAllRows } from '../../services/spreadsheetStore'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'

export function useInstallmentsData() {
  const dataRevision = useDataRefresh()
  const [plans, setPlans] = useState<PlanWithRow[]>([])

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const loadPlans = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!requireAuth()) return

    const hasCachedSheet = !!getSheetAllRows(settings.spreadsheetId, INSTALLMENTS_SHEET)

    if (!hasCachedSheet) {
      setLoading(true)
    }
    try {
      if (!hasCachedSheet) {
        await ensureInstallmentsSheet(settings.spreadsheetId)
      }

      const data = await fetchInstallmentPlans(settings.spreadsheetId)

      setPlans(data)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری اقساط' })) return
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isConfigured()) loadPlans()
  }, [loadPlans, dataRevision])

  return {
    plans,
    setPlans,
    loading,
    loadPlans
  }
}
