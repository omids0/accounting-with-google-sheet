import { useCallback, useEffect, useMemo, useState } from 'react'

import type { WalletAccountWithRow } from './types'
import type { ReviewedSms } from '../../services/bankSmsQueue'
import {
  accountSms,
  isDifferenceIgnored,
  reconcileAccount,
  type AccountReconcile
} from '../../services/bankSmsReconcile'
import {
  canReconcile,
  isReconcileAvailable,
  loadReconcileSms,
  localReconcileLinks,
  refreshReconcileDigest
} from '../../services/bankSmsReconcileData'
import {
  ignoreReconcileDifference,
  readReconcileEntries
} from '../../services/bankSmsReconcileStore'
import type { LedgerEntry } from '../../services/recordDuplicates'
import { loadRecordLedger } from '../../services/recordLedger'
import { getSettings } from '../../services/settings'

export interface WalletReconcileView {
  result: AccountReconcile | null
  hidden: boolean
}

/** Per wallet account: does the app balance agree with the newest bank SMS? */
export function useWalletReconcile(accounts: WalletAccountWithRow[]) {
  const enabled = isReconcileAvailable()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const [data, setData] = useState<{ sms: ReviewedSms[]; ledger: LedgerEntry[] } | null>(null)
  const [entries, setEntries] = useState(() => readReconcileEntries(spreadsheetId))

  // `accounts` is a new list after every wallet reload (also after a sync).
  useEffect(() => {
    const settings = getSettings()

    if (!enabled || !settings || !accounts.length) return

    let cancelled = false

    void Promise.all([
      loadReconcileSms(settings.spreadsheetId, accounts),
      loadRecordLedger(settings)
    ])
      .then(([sms, ledger]) => {
        if (cancelled) return
        setData({ sms, ledger })
        refreshReconcileDigest(settings.spreadsheetId, accounts, sms, ledger)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [enabled, accounts])

  const results = useMemo(() => {
    const map = new Map<string, AccountReconcile | null>()

    if (!data) return map

    const links = localReconcileLinks(data.sms, data.ledger)

    for (const account of accounts) {
      if (!canReconcile(account)) continue

      const sms = accountSms(data.sms, account.id)

      map.set(account.id, reconcileAccount(account.id, account.balance, sms, data.ledger, links))
    }

    return map
  }, [accounts, data])

  const viewFor = useCallback(
    (accountId: string): WalletReconcileView | null => {
      if (!results.has(accountId)) return null

      const result = results.get(accountId) ?? null

      return {
        result,
        hidden: !!result && isDifferenceIgnored(entries[accountId], result.difference)
      }
    },
    [results, entries]
  )

  const ignore = useCallback(
    (accountId: string) => {
      const difference = results.get(accountId)?.difference

      if (!spreadsheetId || !difference) return
      ignoreReconcileDifference(spreadsheetId, accountId, difference)
      setEntries(readReconcileEntries(spreadsheetId))
    },
    [results, spreadsheetId]
  )

  return { viewFor, ignore }
}
