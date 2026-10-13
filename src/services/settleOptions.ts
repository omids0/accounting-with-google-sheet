import { getItem, setItem } from './storage'
import { type WALLET_APPLY_NO, type WALLET_APPLY_YES } from '../components/form/fieldUtils'

/** What the settle sheet answers: when it was paid, from which account, and an optional link. */
export interface SettleOptions {
  date: string
  walletAccount: string
  walletApply: typeof WALLET_APPLY_YES | typeof WALLET_APPLY_NO
  /** An existing record that already is this payment: nothing is created, no balance moves. */
  linkRecordId?: string
}

/** What unpaying does with a record the user linked instead of letting the app create one. */
export type UnlinkChoice = 'keep' | 'delete'

type SettleType = 'expense' | 'income'

/** Per spreadsheet: `{ [spreadsheetId]: { expense?: accountId, income?: accountId } }`; wiped with the account. */
export const SETTLE_LAST_ACCOUNT_KEY = 'accounting_settle_account_v1'

type Store = Record<string, Partial<Record<SettleType, string>>>

export function readLastSettleAccount(spreadsheetId: string, type: SettleType): string {
  return getItem<Store>(SETTLE_LAST_ACCOUNT_KEY)?.[spreadsheetId]?.[type] ?? ''
}

export function writeLastSettleAccount(
  spreadsheetId: string,
  type: SettleType,
  accountId: string
): void {
  const store = getItem<Store>(SETTLE_LAST_ACCOUNT_KEY) ?? {}

  try {
    setItem(SETTLE_LAST_ACCOUNT_KEY, {
      ...store,
      [spreadsheetId]: { ...store[spreadsheetId], [type]: accountId }
    })
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
}
