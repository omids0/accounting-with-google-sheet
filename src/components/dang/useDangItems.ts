import { useState, useEffect, useCallback } from 'react'

import type { DangWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { isTokenValid } from '../../services/auth'
import { syncCategoriesFromSheet } from '../../services/categories'
import {
  deleteDang,
  ensureDangSheet,
  exportDangsCsv,
  exportDangsPdf,
  fetchDangs,
  importDangsCsv,
  sortDangs,
  toggleDangPaid,
  updateDang
} from '../../services/dang'
import { getDangCategories, getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import type { Dang } from '../../types'
import { showError, showSuccess } from '../../utils/toast'

export function useDangItems(onReauth?: () => void) {
  const [items, setItems] = useState<DangWithRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [deletingItem, setDeletingItem] = useState<DangWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState('')
  const [savingAmountId, setSavingAmountId] = useState('')
  const [amountEdits, setAmountEdits] = useState<Record<string, number | ''>>({})
  const [categories, setCategories] = useState<string[]>(() => getDangCategories())

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
      await ensureDangSheet(settings.spreadsheetId)
      await syncCategoriesFromSheet(settings.spreadsheetId)
      setCategories(getDangCategories())

      const data = await fetchDangs(settings.spreadsheetId)

      setItems(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری بدهی‌ها'

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

  const handleTogglePaid = async (item: DangWithRow, paid: boolean) => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setTogglingId(item.id)
    try {
      const updated = await toggleDangPaid(settings.spreadsheetId, item, paid)

      setItems(prev =>
        sortDangs(prev.map(d => (d.id === item.id ? { ...updated, rowNumber: item.rowNumber } : d)))
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

  const handleAmountChange = (item: DangWithRow, value: number | '') => {
    setAmountEdits(prev => ({ ...prev, [item.id]: value }))
  }

  const handleAmountBlur = async (item: DangWithRow) => {
    const pending = amountEdits[item.id]

    if (pending === undefined) return

    setAmountEdits(prev => {
      const next = { ...prev }

      delete next[item.id]

      return next
    })

    const amount = Number(pending)

    if (!amount || amount <= 0) {
      showError('مبلغ باید بیشتر از صفر باشد')

      return
    }
    if (amount === item.amount) return

    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setSavingAmountId(item.id)
    try {
      const updated: Dang = { ...item, amount }

      await updateDang(settings.spreadsheetId, item.rowNumber, updated)
      setItems(prev =>
        sortDangs(prev.map(d => (d.id === item.id ? { ...updated, rowNumber: item.rowNumber } : d)))
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی مبلغ'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setSavingAmountId('')
    }
  }

  const openDeleteConfirm = (item: DangWithRow) => {
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
      await deleteDang(settings.spreadsheetId, deletingItem.rowNumber, deletingItem)
      if (expandedId === deletingItem.id) setExpandedId(null)
      setDeletingItem(null)
      showSuccess('بدهی حذف شد')
      await loadItems()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف بدهی'

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
      exportFn: exportDangsCsv,
      exportPdfFn: exportDangsPdf,
      importFn: importDangsCsv,
      onComplete: loadItems,
      onReauth
    })

  return {
    items,
    loading,
    categories,
    setCategories,
    expandedId,
    setExpandedId,
    deletingItem,
    deleting,
    togglingId,
    savingAmountId,
    amountEdits,
    loadItems,
    handleTogglePaid,
    handleAmountChange,
    handleAmountBlur,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal
  }
}
