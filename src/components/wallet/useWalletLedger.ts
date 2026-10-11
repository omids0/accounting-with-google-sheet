import { useEffect, useState } from 'react'

import { getSettings } from '../../services/settings'
import { fetchLedger, type LedgerEntry } from '../../services/walletLedger'
import { handleSheetError } from '../../utils/sheetError'

/** History rows of one wallet account, newest first. */
export function useWalletLedger(accountId: string) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) {
      setLoading(false)

      return
    }

    setLoading(true)
    fetchLedger(spreadsheetId, accountId)
      .then(rows => {
        if (!cancelled) setEntries(rows)
      })
      .catch(error => handleSheetError(error, { fallbackMessage: 'خطا در دریافت گردش حساب' }))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accountId])

  return { entries, loading }
}
