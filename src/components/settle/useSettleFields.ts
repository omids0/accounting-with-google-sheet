import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { LedgerEntry } from '../../services/recordDuplicates'
import { loadRecordLedger } from '../../services/recordLedger'
import { isRecordLinked } from '../../services/recordLinks'
import { getSettings } from '../../services/settings'
import { describeDuplicate, findSettleDuplicate } from '../../services/settleDuplicates'
import {
  readLastSettleAccount,
  writeLastSettleAccount,
  type SettleOptions
} from '../../services/settleOptions'
import { fetchWalletAccounts } from '../../services/wallet'
import { getActiveWorkspaceType } from '../../services/workspace'
import type { WalletAccount } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'
import { WALLET_APPLY_NO, WALLET_APPLY_YES } from '../form/fieldUtils'

interface UseSettleFieldsArgs {
  type: 'expense' | 'income'
  /** The amount being settled; the duplicate check needs it exactly. */
  amount: number
  /** `transactionRecordId` of every item of the module: those records belong to a settlement already. */
  linkedIds: readonly string[]
  /** False while the sheet or form is closed: nothing loads and the answers reset on open. */
  active?: boolean
  defaultDate?: string
}

/**
 * State of the settle answers: date, account («آخرین انتخاب»), balance switch, and the
 * possible duplicate (a record of the same amount from the last ±3 days) to link instead.
 */
export function useSettleFields({
  type,
  amount,
  linkedIds,
  active = true,
  defaultDate
}: UseSettleFieldsArgs) {
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const [date, setDate] = useState(defaultDate || getTodayIso())
  const [account, setAccount] = useState('')
  const [apply, setApply] = useState<string>(WALLET_APPLY_YES)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [linkId, setLinkId] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const defaulted = useRef(false)

  useEffect(() => {
    const settings = getSettings()

    if (!active || !settings?.spreadsheetId) return

    let live = true

    setDate(defaultDate || getTodayIso())
    setAccount(readLastSettleAccount(settings.spreadsheetId, type))
    setApply(WALLET_APPLY_YES)
    setLinkId('')
    setDismissed(false)
    defaulted.current = false
    void loadRecordLedger(settings, type)
      .then(entries => live && setLedger(entries))
      .catch(() => undefined)
    void fetchWalletAccounts(settings.spreadsheetId)
      .then(items => live && setAccounts(items))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [active, type, defaultDate])

  // A building pays out of its fund: without a remembered account the first one is picked.
  useEffect(() => {
    if (!active || defaulted.current || !accounts.length) return
    defaulted.current = true
    if (getActiveWorkspaceType() === 'building') setAccount(current => current || accounts[0].id)
  }, [active, accounts])

  const linkedKey = linkedIds.join('|')
  // A record tied to ANY module's payment (not only this module's) is not offered again.
  const isLinked = useCallback(
    (entry: LedgerEntry) => (entry.id ? isRecordLinked(spreadsheetId, entry.id, type) : false),
    [spreadsheetId, type]
  )
  const duplicate = useMemo(
    () =>
      dismissed || !(amount > 0)
        ? null
        : findSettleDuplicate(
            { type, amount, date },
            ledger,
            new Set(linkedKey.split('|')),
            isLinked
          ),
    [dismissed, amount, type, date, ledger, linkedKey, isLinked]
  )

  const linked = Boolean(linkId) && duplicate?.id === linkId

  return {
    date,
    setDate,
    account,
    setAccount,
    apply,
    setApply,
    duplicate,
    duplicateText: duplicate ? describeDuplicate(duplicate, accounts) : '',
    linked,
    link: () => setLinkId(duplicate?.id ?? ''),
    /** «فرق دارد، رکورد جدید»: forget the match for this settlement. */
    dismiss: () => {
      setLinkId('')
      setDismissed(true)
    },
    /** What the services take; remembers the account for next time unless a record was linked. */
    commit: (): SettleOptions => {
      if (!linked && spreadsheetId) writeLastSettleAccount(spreadsheetId, type, account)

      return {
        date,
        walletAccount: linked ? '' : account,
        walletApply: account && apply === WALLET_APPLY_YES ? WALLET_APPLY_YES : WALLET_APPLY_NO,
        ...(linked ? { linkRecordId: linkId } : {})
      }
    }
  }
}

export type SettleFieldsState = ReturnType<typeof useSettleFields>
