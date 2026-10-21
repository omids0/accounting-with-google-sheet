import { useEffect, useState } from 'react'

import { useIsBuildingWorkspace } from '../../hooks/useWorkspaceType'
import { getSettings } from '../../services/settings'
import { readLastSettleAccount, writeLastSettleAccount } from '../../services/settleOptions'
import { fetchWalletAccounts } from '../../services/wallet'
import type { CustomForm } from '../../types'
import { WALLET_ACCOUNT_FIELD_ID } from '../form/fieldUtils'

/**
 * The fund account an entry form of a building starts with: the one used last for this kind of
 * entry (shared with the settle sheet), else the first fund account; '' when there is none.
 */
export function pickFundAccount(accountIds: readonly string[], lastUsed: string): string {
  return lastUsed && accountIds.includes(lastUsed) ? lastUsed : accountIds[0] ?? ''
}

type EntryType = 'expense' | 'income'

export const isMoneyEntry = (type: string): type is EntryType =>
  type === 'expense' || type === 'income'

/** Remembers the account of a saved entry so the next one starts with it. */
export function rememberEntryAccount(type: EntryType, accountId: string): void {
  const spreadsheetId = getSettings()?.spreadsheetId

  if (spreadsheetId && accountId) writeLastSettleAccount(spreadsheetId, type, accountId)
}

/**
 * In a building, an expense or income entry must move the fund: this gives the account to
 * preselect ('' while the accounts load, or when `active` is false). The user can still choose
 * «بدون حساب» afterwards; the form applies the value once.
 */
export function useEntryFundAccount(inBuilding: boolean, formType: string): string {
  const active = inBuilding && isMoneyEntry(formType)
  const type: EntryType = formType === 'income' ? 'income' : 'expense'
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!active || !spreadsheetId) return

    let live = true

    void fetchWalletAccounts(spreadsheetId)
      .then(accounts => {
        if (live) {
          setAccountId(
            pickFundAccount(
              accounts.map(account => account.id),
              readLastSettleAccount(spreadsheetId, type)
            )
          )
        }
      })
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [active, type])

  return accountId
}

type FormValues = Record<string, string | number>

/**
 * Account handling of the entry form in a building workspace: the form starts with the fund
 * account (applied once it is known, only when still empty, so a later «بدون حساب» stays), and
 * `afterSave` remembers the account of a saved entry and returns the prefill that keeps it for
 * the next one (kind and split start over). Nothing happens in a personal workspace.
 */
export function useBuildingEntryAccount(
  form: CustomForm,
  getValues: () => FormValues,
  setValue: (id: string, value: string | number) => void
): (saved: FormValues) => FormValues {
  const isBuilding = useIsBuildingWorkspace()
  const fundAccount = useEntryFundAccount(isBuilding, form.type)

  useEffect(() => {
    const hasAccountField = form.fields.some(field => field.id === WALLET_ACCOUNT_FIELD_ID)

    if (
      fundAccount &&
      hasAccountField &&
      !String(getValues()[WALLET_ACCOUNT_FIELD_ID] ?? '').trim()
    )
      setValue(WALLET_ACCOUNT_FIELD_ID, fundAccount)
    // Applied once per loaded account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundAccount])

  return saved => {
    const account = String(saved[WALLET_ACCOUNT_FIELD_ID] ?? '')

    const keep: FormValues = {}

    if (!isBuilding || !isMoneyEntry(form.type)) return keep
    rememberEntryAccount(form.type, account)
    if (account) keep[WALLET_ACCOUNT_FIELD_ID] = account

    return keep
  }
}
