import { useCallback, useEffect, useRef, useState } from 'react'

import { getSettings } from '../../services/settings'
import { fetchLedger, type LedgerEntry } from '../../services/walletLedger'
import { handleSheetError } from '../../utils/sheetError'

/** History rows of one wallet account, newest first. */
export function useWalletLedger(accountId: string) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const reload = useCallback(async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) {
      setLoading(false)

      return
    }

    setLoading(true)
    try {
      const rows = await fetchLedger(spreadsheetId, accountId)

      if (mounted.current) setEntries(rows)
    } catch (error) {
      if (mounted.current) handleSheetError(error, { fallbackMessage: 'خطا در دریافت گردش حساب' })
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    mounted.current = true
    void reload()

    return () => {
      mounted.current = false
    }
  }, [reload])

  return { entries, loading, reload }
}
