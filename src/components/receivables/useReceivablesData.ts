import { useState, useEffect, useCallback } from 'react'

import type { ReceivableWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { syncCategoriesFromSheet } from '../../services/categories'
import { ensureReceivablesSheet, fetchReceivables } from '../../services/receivables'
import { getSettings, isConfigured, getReceivableCategories } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'

export function useReceivablesData() {
  const dataRevision = useDataRefresh()
  const [items, setItems] = useState<ReceivableWithRow[]>([])

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const [categories, setCategories] = useState<string[]>(() => getReceivableCategories())

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!requireAuth()) return

    setLoading(true)
    try {
      await ensureReceivablesSheet(settings.spreadsheetId)
      await syncCategoriesFromSheet(settings.spreadsheetId)
      setCategories(getReceivableCategories())

      const data = await fetchReceivables(settings.spreadsheetId)

      setItems(data)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری طلب‌ها' })) return
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isConfigured()) loadItems()
  }, [loadItems, dataRevision])

  return {
    items,
    setItems,
    loading,
    categories,
    setCategories,
    loadItems
  }
}
