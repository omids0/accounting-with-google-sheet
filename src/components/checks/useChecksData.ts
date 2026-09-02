import { useState, useEffect, useCallback } from 'react'

import type { CheckWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { usePaidItemActions } from '../../hooks/usePaidItemActions'
import { isTokenValid } from '../../services/auth'
import {
  deleteCheck,
  ensureChecksSheet,
  exportChecksCsv,
  exportChecksPdf,
  fetchChecks,
  importChecksCsv,
  sortChecks,
  toggleCheckPaid
} from '../../services/checks'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { handleSheetError } from '../../utils/sheetError'

export function useChecksData(onReauth?: () => void) {
  const [items, setItems] = useState<CheckWithRow[]>([])
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const dataRevision = useDataRefresh()

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!isTokenValid()) {
      onReauth?.()

      return
    }

    setLoading(true)
    try {
      await ensureChecksSheet(settings.spreadsheetId)

      const data = await fetchChecks(settings.spreadsheetId)

      setItems(data)
    } catch (err) {
      handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری چک‌ها' })
    } finally {
      setLoading(false)
    }
  }, [onReauth])

  useEffect(() => {
    if (isConfigured()) loadItems()
  }, [loadItems, dataRevision])

  const paidActions = usePaidItemActions({
    setItems,
    onReauth,
    loadItems,
    togglePaid: toggleCheckPaid,
    deleteItem: deleteCheck,
    sortItems: sortChecks,
    deleteSuccessMessage: 'چک حذف شد',
    deleteErrorMessage: 'خطا در حذف چک',
    importExport: {
      exportFn: exportChecksCsv,
      exportPdfFn: exportChecksPdf,
      importFn: importChecksCsv
    }
  })

  return {
    items,
    loading,
    loadItems,
    ...paidActions
  }
}
