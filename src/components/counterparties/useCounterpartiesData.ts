import { useCallback, useEffect, useState } from 'react'

import type { CounterpartyWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import {
  deleteCounterparty,
  ensureCounterpartiesSheet,
  fetchCounterparties
} from '../../services/counterparties'
import {
  exportCounterpartiesCsv,
  exportCounterpartiesPdf,
  importCounterpartiesCsv
} from '../../services/counterpartiesSheetIO'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

export function useCounterpartiesData() {
  const [items, setItems] = useState<CounterpartyWithRow[]>([])
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [deletingItem, setDeletingItem] = useState<CounterpartyWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const dataRevision = useDataRefresh()

  const loadItems = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      await ensureCounterpartiesSheet(spreadsheetId)

      const data = await fetchCounterparties(spreadsheetId)

      setItems(data)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری طرف حساب‌ها' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isConfigured()) return

    void loadItems()
  }, [loadItems, dataRevision])

  const openDeleteConfirm = (item: CounterpartyWithRow) => {
    setDeletingItem(item)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleDelete = async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !deletingItem) return

    setDeleting(true)
    try {
      await deleteCounterparty(spreadsheetId, deletingItem.rowNumber)
      setItems(current => current.filter(item => item.id !== deletingItem.id))
      setDeletingItem(null)
      showSuccess('طرف حساب حذف شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'حذف ناموفق بود')
    } finally {
      setDeleting(false)
    }
  }

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportCounterpartiesCsv,
      exportPdfFn: exportCounterpartiesPdf,
      importFn: importCounterpartiesCsv,
      onComplete: loadItems
    })

  return {
    items,
    loading,
    deletingItem,
    deleting,
    loadItems,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal
  }
}
