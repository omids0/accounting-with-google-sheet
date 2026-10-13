import { useState, useEffect, useCallback, useMemo } from 'react'

import type { TransactionWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { fetchTgjuPrices, getCachedTgjuPrices } from '../../services/tgju'
import {
  getDisplayTgjuPrices,
  getSummableTgjuPrices,
  vaultPriceKeys
} from '../../services/tgjuCurrency'
import { ensureTreasurySheet, fetchVaultTransactions } from '../../services/treasury'
import { getAssetClassLabel, getVaultCatalog } from '../../services/treasuryCatalog'
import { seedVaultCatalog } from '../../services/treasuryCatalogSheet'
import { computeHoldings } from '../../services/treasuryHoldings'
import { requireAuth } from '../../utils/authGuard'
import { matchSearch } from '../../utils/search'
import { handleSheetError } from '../../utils/sheetError'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

export function useTreasuryData(active: boolean, searchQuery: string) {
  const [transactions, setTransactions] = useState<TransactionWithRow[]>([])

  const [catalog, setCatalog] = useState(getVaultCatalog)

  /** Bumped after each tgju fetch; prices are derived from tgju's cached quotes. */
  const [quotesVersion, setQuotesVersion] = useState(0)

  const [expandedAsset, setExpandedAsset] = useState<string | null>(null)

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const [priceLoading, setPriceLoading] = useState(false)

  const dataRevision = useDataRefresh()

  const undoableDelete = useUndoableDelete()

  const { visible } = undoableDelete

  const loadPrices = useCallback(async () => {
    setPriceLoading(true)
    try {
      await fetchTgjuPrices(vaultPriceKeys())
      setQuotesVersion(version => version + 1)
    } catch (err) {
      showError(toUserMessage(err, 'خطا در دریافت قیمت‌ها'))
    } finally {
      setPriceLoading(false)
    }
  }, [])

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!requireAuth()) return

    setLoading(true)
    try {
      await ensureTreasurySheet(settings.spreadsheetId)

      const [data, nextCatalog] = await Promise.all([
        fetchVaultTransactions(settings.spreadsheetId),
        seedVaultCatalog(settings.spreadsheetId)
      ])

      setTransactions(data)
      setCatalog(nextCatalog)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری صندوقچه' })) return
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isConfigured() || !active) return
    void loadItems()
    void loadPrices()
  }, [active, loadItems, loadPrices, dataRevision])

  const refreshTreasury = useCallback(() => {
    void loadItems()
    void loadPrices()
  }, [loadItems, loadPrices])

  /** After a catalog edit (new asset, manual price, rename). */
  const reloadCatalog = useCallback(() => setCatalog(getVaultCatalog()), [])

  // Re-derived when the catalog changes too: a user-added tgju key reads the cached quotes.
  const prices = useMemo(
    () => getCachedTgjuPrices(vaultPriceKeys()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, quotesVersion]
  )

  const displayPrices = useMemo(() => getDisplayTgjuPrices(prices), [prices])

  const summablePrices = useMemo(() => getSummableTgjuPrices(prices), [prices])

  // Holdings and totals leave out the transaction waiting in the undo window.
  const visibleTransactions = useMemo(() => visible(transactions), [visible, transactions])

  const holdings = useMemo(
    () => (summablePrices ? computeHoldings(visibleTransactions, summablePrices, catalog) : []),
    [summablePrices, visibleTransactions, catalog]
  )

  const searchedHoldings = useMemo(
    () =>
      holdings.filter(holding =>
        matchSearch(
          searchQuery,
          holding.asset.name,
          holding.asset.symbol,
          getAssetClassLabel(holding.asset.assetClass),
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
    catalog,
    prices: displayPrices,
    loading,
    priceLoading,
    expandedAsset,
    setExpandedAsset,
    loadPrices,
    loadItems,
    refreshTreasury,
    reloadCatalog,
    undoableDelete,
    holdings,
    searchedHoldings
  }
}
