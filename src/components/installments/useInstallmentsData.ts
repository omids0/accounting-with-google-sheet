import { useState, useEffect, useCallback } from 'react'

import type { PlanWithRow } from './types'
import { isTokenValid } from '../../services/auth'
import {
  ensureInstallmentsSheet,
  fetchInstallmentPlans,
  INSTALLMENTS_SHEET
} from '../../services/installments'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData, getSheetAllRows } from '../../services/spreadsheetStore'
import { handleSheetError } from '../../utils/sheetError'

export function useInstallmentsData(onReauth: (() => void) | undefined, dataRevision: number) {
  const [plans, setPlans] = useState<PlanWithRow[]>([])

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const loadPlans = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!isTokenValid()) {
      onReauth?.()

      return
    }

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
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری اقساط' })) return
    } finally {
      setLoading(false)
    }
  }, [onReauth])

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
