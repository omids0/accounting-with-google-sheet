import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import type { LedgerEntry } from '../../services/bankSmsQueue'
import { rememberWorkspaceCards } from '../../services/bankSmsRouting'
import { loadRecordLedger } from '../../services/recordLedger'
import { fetchRecurringItems, stripRow } from '../../services/recurringSheet'
import { getSettings } from '../../services/settings'
import { fetchTransfers, type Transfer } from '../../services/transfers'
import { fetchWalletAccounts } from '../../services/wallet'
import type { RecurringItem } from '../../types'
import { handleSheetError } from '../../utils/sheetError'
import type { WalletAccountWithRow } from '../wallet/types'

/** Accounts, records and recurring items the queue matches SMS against. */
export function useBankSmsContext() {
  const [accounts, setAccounts] = useState<WalletAccountWithRow[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [recurring, setRecurring] = useState<RecurringItem[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])

  const reload = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return

    try {
      const [walletAccounts, entries, items, transferRows] = await Promise.all([
        fetchWalletAccounts(settings.spreadsheetId),
        loadRecordLedger(settings),
        // Suggestions only: a missing «تکرارها» tab must not break the queue.
        fetchRecurringItems(settings.spreadsheetId).catch(() => []),
        // Duplicate detection only: an unreadable «انتقال‌ها» must not break the queue.
        fetchTransfers(settings.spreadsheetId).catch(() => [])
      ])

      setAccounts(walletAccounts)
      rememberWorkspaceCards(settings.spreadsheetId, walletAccounts)
      setLedger(entries)
      setRecurring(items.map(stripRow))
      setTransfers(transferRows)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در خواندن حساب‌ها' })
    }
  }, [])

  // Accounts and records also change on sync, not only through this page.
  const dataRevision = useDataRefresh()

  useEffect(() => {
    void reload()
  }, [reload, dataRevision])

  return { accounts, ledger, recurring, transfers, reload }
}
