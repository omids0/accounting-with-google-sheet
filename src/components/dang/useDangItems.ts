import { useState, useEffect, useCallback } from 'react'

import type { DangWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { usePaidItemActions } from '../../hooks/usePaidItemActions'
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
import { handleSheetError } from '../../utils/sheetError'
import { showError } from '../../utils/toast'

export function useDangItems(onReauth?: () => void) {
  const [items, setItems] = useState<DangWithRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
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
      handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری بدهی‌ها' })
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
    togglePaid: toggleDangPaid,
    deleteItem: deleteDang,
    sortItems: sortDangs,
    deleteSuccessMessage: 'بدهی حذف شد',
    deleteErrorMessage: 'خطا در حذف بدهی',
    onBeforeDelete: item => {
      if (expandedId === item.id) setExpandedId(null)
    },
    importExport: {
      exportFn: exportDangsCsv,
      exportPdfFn: exportDangsPdf,
      importFn: importDangsCsv
    }
  })

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
      handleSheetError(err, { onReauth, fallbackMessage: 'خطا در به‌روزرسانی مبلغ' })
    } finally {
      setSavingAmountId('')
    }
  }

  return {
    items,
    loading,
    categories,
    setCategories,
    expandedId,
    setExpandedId,
    savingAmountId,
    amountEdits,
    loadItems,
    handleAmountChange,
    handleAmountBlur,
    ...paidActions
  }
}
