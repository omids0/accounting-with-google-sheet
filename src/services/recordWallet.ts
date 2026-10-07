import { fetchWalletAccounts, updateWalletAccount } from './wallet'
import { WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'
import type { FormType } from '../types'
import { parseNumeric } from '../utils/parseNumeric'

/** How one income/expense record moves the balance of the wallet account it names. */
export interface RecordWalletEffect {
  accountId: string
  delta: number
}

type RecordValues = Record<string, string | number | undefined>

export function walletEffectOf(type: FormType, values: RecordValues): RecordWalletEffect | null {
  if (type !== 'income' && type !== 'expense') return null

  const accountId = String(values[WALLET_ACCOUNT_FIELD_ID] ?? '').trim()
  const amount = parseNumeric(values.amount)

  if (!accountId || !amount) return null

  return { accountId, delta: type === 'expense' ? -amount : amount }
}

/** Net change per account when a record goes from `before` to `after` (null = absent). */
export function netWalletChanges(
  before: RecordWalletEffect | null,
  after: RecordWalletEffect | null
): Map<string, number> {
  const changes = new Map<string, number>()
  const add = (accountId: string, delta: number) =>
    changes.set(accountId, (changes.get(accountId) ?? 0) + delta)

  if (before) add(before.accountId, -before.delta)
  if (after) add(after.accountId, after.delta)

  for (const [accountId, delta] of changes) if (delta === 0) changes.delete(accountId)

  return changes
}

/**
 * Keep wallet balances in step with records: undo `before`, apply `after`.
 * Create = (null, effect); delete = (effect, null); edit = (old, new).
 */
export async function applyWalletChanges(
  spreadsheetId: string,
  before: RecordWalletEffect | null,
  after: RecordWalletEffect | null
): Promise<void> {
  const changes = netWalletChanges(before, after)

  if (!changes.size) return

  const accounts = await fetchWalletAccounts(spreadsheetId)

  for (const [accountId, delta] of changes) {
    const account = accounts.find(item => item.id === accountId)

    if (account)
      await updateWalletAccount(spreadsheetId, { ...account, balance: account.balance + delta })
  }
}
