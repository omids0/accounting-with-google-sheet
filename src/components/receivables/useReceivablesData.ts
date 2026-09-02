import { useState, useEffect, useCallback } from 'react'

import type { ReceivableWithRow } from './types'
import { isTokenValid } from '../../services/auth'
import { syncCategoriesFromSheet } from '../../services/categories'
import { ensureReceivablesSheet, fetchReceivables } from '../../services/receivables'
import { getSettings, isConfigured, getReceivableCategories } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { handleSheetError } from '../../utils/sheetError'

export function useReceivablesData(onReauth: (() => void) | undefined, dataRevision: number) {
  const [items, setItems] = useState<ReceivableWithRow[]>([])

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const [categories, setCategories] = useState<string[]>(() => getReceivableCategories())

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!isTokenValid()) {
      onReauth?.()

      return
    }

    setLoading(true)
    try {
      await ensureReceivablesSheet(settings.spreadsheetId)
      await syncCategoriesFromSheet(settings.spreadsheetId)
      setCategories(getReceivableCategories())

      const data = await fetchReceivables(settings.spreadsheetId)

      setItems(data)
    } catch (err) {
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری طلب‌ها' })) return
    } finally {
      setLoading(false)
    }
  }, [onReauth])

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
