import { useEffect, useState } from 'react'

import { useDataRefresh } from '../../../hooks/useDataRefresh'
import { getSettings } from '../../../services/settings'
import { fetchWalletAccounts } from '../../../services/wallet'
import type { WalletAccount } from '../../../types'

/** The wallet accounts, read again whenever the sheet's data changes; empty while `enabled` is off. */
export function useTransferAccounts(enabled = true): WalletAccount[] {
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const revision = useDataRefresh()

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!enabled || !spreadsheetId) {
      setAccounts([])

      return
    }

    let active = true

    void fetchWalletAccounts(spreadsheetId)
      .then(items => active && setAccounts(items))
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [enabled, revision])

  return accounts
}
