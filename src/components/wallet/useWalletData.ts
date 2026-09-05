import { useState, useEffect, useCallback } from 'react'

import type { WalletAccountWithRow } from './types'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { ensureAutoOpeningBalanceForCurrentMonth } from '../../services/monthlyBalance'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import {
  ensureWalletSheet,
  fetchWalletAccounts,
  loadWalletPeriodFlow,
  type WalletPeriodFlow
} from '../../services/wallet'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'

export function useWalletData() {
  const dataRevision = useDataRefresh()
  const [items, setItems] = useState<WalletAccountWithRow[]>([])

  const [balances, setBalances] = useState<Record<string, number | ''>>({})

  const [periodFlow, setPeriodFlow] = useState<WalletPeriodFlow | null>(null)

  const [openingInput, setOpeningInput] = useState<number | ''>('')

  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })

  const syncBalances = useCallback((accounts: WalletAccountWithRow[]) => {
    const next: Record<string, number | ''> = {}

    for (const account of accounts) {
      next[account.id] = account.balance
    }
    setBalances(next)
  }, [])

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!requireAuth()) return

    setLoading(true)
    try {
      await ensureWalletSheet(settings.spreadsheetId)

      const data = await fetchWalletAccounts(settings.spreadsheetId)

      const walletTotal = data.reduce((sum, item) => sum + item.balance, 0)

      await ensureAutoOpeningBalanceForCurrentMonth(settings.spreadsheetId, walletTotal)

      const flow = await loadWalletPeriodFlow(settings)

      setItems(data)
      syncBalances(data)
      setPeriodFlow(flow)
      setOpeningInput(flow.openingBalance || '')
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری کیف پول' })) return
    } finally {
      setLoading(false)
    }
  }, [syncBalances])

  useEffect(() => {
    if (isConfigured()) loadItems()
  }, [loadItems, dataRevision])

  return {
    items,
    setItems,
    balances,
    setBalances,
    periodFlow,
    setPeriodFlow,
    openingInput,
    setOpeningInput,
    loading,
    loadItems,
    syncBalances
  }
}
