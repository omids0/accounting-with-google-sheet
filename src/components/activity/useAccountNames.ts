import { useCallback, useEffect, useState } from 'react'

import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'

/** Account id → title, so a trail line names the account instead of showing its id. */
export function useAccountNames(): (accountId: string) => string {
  const [names, setNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    let live = true

    void fetchWalletAccounts(spreadsheetId)
      .then(accounts => {
        if (live) setNames(new Map(accounts.map(account => [account.id, account.title])))
      })
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [])

  return useCallback((accountId: string) => names.get(accountId) ?? '', [names])
}
