import { useState, useEffect, useCallback } from 'react'

import type { CheckWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
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
import { showError, showSuccess } from '../../utils/toast'

export function useChecksData(onReauth?: () => void) {
  const [items, setItems] = useState<CheckWithRow[]>([])
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [deletingItem, setDeletingItem] = useState<CheckWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState('')

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
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری چک‌ها'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setLoading(false)
    }
  }, [onReauth])

  useEffect(() => {
    if (isConfigured()) loadItems()
  }, [loadItems, dataRevision])

  const handleTogglePaid = async (item: CheckWithRow, paid: boolean) => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setTogglingId(item.id)
    try {
      const updated = await toggleCheckPaid(settings.spreadsheetId, item, paid)

      setItems(prev =>
        sortChecks(
          prev.map(c => (c.id === item.id ? { ...updated, rowNumber: item.rowNumber } : c))
        )
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setTogglingId('')
    }
  }

  const openDeleteConfirm = (item: CheckWithRow) => {
    setDeletingItem(item)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setDeleting(true)
    try {
      await deleteCheck(settings.spreadsheetId, deletingItem.rowNumber, deletingItem)
      setDeletingItem(null)
      showSuccess('چک حذف شد')
      await loadItems()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف چک'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setDeleting(false)
    }
  }

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: exportChecksCsv,
      exportPdfFn: exportChecksPdf,
      importFn: importChecksCsv,
      onComplete: loadItems,
      onReauth
    })

  return {
    items,
    loading,
    togglingId,
    deletingItem,
    deleting,
    loadItems,
    handleTogglePaid,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal
  }
}
