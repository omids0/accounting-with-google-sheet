import { useState, useEffect, useCallback, useMemo } from 'react'

import type { TransactionWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { isTokenValid } from '../../services/auth'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { fetchTgjuPrices, getCachedTgjuPrices, getAssetLabel } from '../../services/tgju'
import {
  computeHoldings,
  ensureTreasurySheet,
  fetchVaultTransactions
} from '../../services/treasury'
import type { VaultAssetType } from '../../types'
import { matchSearch } from '../../utils/search'
import { handleSheetError } from '../../utils/sheetError'
import { showError } from '../../utils/toast'

export function useTreasuryData(
  onReauth: (() => void) | undefined,
  active: boolean,
  searchQuery: string
) {
  const [transactions, setTransactions] = useState<TransactionWithRow[]>([])

  const [prices, setPrices] = useState<Record<VaultAssetType, number> | null>(() =>
    getCachedTgjuPrices()
  )

  const [expandedAsset, setExpandedAsset] = useState<VaultAssetType | null>(null)

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const [priceLoading, setPriceLoading] = useState(false)

  const dataRevision = useDataRefresh()

  const loadPrices = useCallback(async () => {
    setPriceLoading(true)
    try {
      const data = await fetchTgjuPrices()

      setPrices(data)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در دریافت قیمت‌ها')
    } finally {
      setPriceLoading(false)
    }
  }, [])

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!isTokenValid()) {
      onReauth?.()

      return
    }

    setLoading(true)
    try {
      await ensureTreasurySheet(settings.spreadsheetId)

      const data = await fetchVaultTransactions(settings.spreadsheetId)

      setTransactions(data)
    } catch (err) {
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری صندوقچه' })) return
    } finally {
      setLoading(false)
    }
  }, [onReauth])

  useEffect(() => {
    if (!isConfigured() || !active) return
    loadItems()
    loadPrices()
  }, [active, loadItems, loadPrices, dataRevision])

  const refreshTreasury = useCallback(() => {
    loadItems()
    loadPrices()
  }, [loadItems, loadPrices])

  const holdings = prices ? computeHoldings(transactions, prices) : []

  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0)

  const filteredHoldings = useMemo(
    () =>
      holdings.filter(holding =>
        matchSearch(
          searchQuery,
          getAssetLabel(holding.assetType),
          holding.netQuantity,
          holding.currentUnitPrice,
          holding.totalValue,
          ...holding.transactions.flatMap(tx => [tx.note, tx.quantity, tx.unitPrice])
        )
      ),
    [holdings, searchQuery]
  )

  return {
    transactions,
    prices,
    loading,
    priceLoading,
    expandedAsset,
    setExpandedAsset,
    loadPrices,
    loadItems,
    refreshTreasury,
    holdings,
    filteredHoldings,
    totalValue
  }
}
