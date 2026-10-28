import { fetchWalletAccounts, updateWalletAccount } from './wallet'
import { refreshWalletAccounts } from './walletFresh'
import {
  ledgerEntry,
  logLedger,
  refundedAccountIds,
  type LedgerContext,
  type LedgerEntry,
  type LedgerSource
} from './walletLedger'
import {
  isWalletApplied,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID
} from '../components/form/fieldUtils'
import type { FormType } from '../types'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'

/** How one income/expense record moves the balance of the wallet account it names. */
export interface RecordWalletEffect {
  accountId: string
  delta: number
}

type RecordValues = Record<string, string | number | undefined>

export function walletEffectOf(type: FormType, values: RecordValues): RecordWalletEffect | null {
  if (type !== 'income' && type !== 'expense') return null
  if (!isWalletApplied(values)) return null

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
    changes.set(accountId, roundMoney((changes.get(accountId) ?? 0) + delta))

  if (before) add(before.accountId, -before.delta)
  if (after) add(after.accountId, after.delta)

  for (const [accountId, delta] of changes) if (delta === 0) changes.delete(accountId)

  return changes
}

/** Ledger context of a change caused by an income/expense record. */
export function recordLedgerContext(
  values: RecordValues,
  source: LedgerSource,
  recordId?: string
): LedgerContext {
  // Vehicle expenses build their title later; the category still says what it was.
  const title = String(values.title || values.category || '')

  return { title, date: String(values.date ?? ''), source, recordId }
}

/**
 * The two halves of `applyWalletChanges`, split so a caller can finish every NETWORK read before it
 * writes anything: this awaits the reads (fresh balances) and returns the writes, which only touch
 * the local mirror and the outbox. `refresh: false` skips the balance re-read (the app is being
 * closed): the queued write is then merged on top of the sheet's balance instead.
 * A delete whose refund is already in the history (a retry after an interruption) returns nothing
 * to write for that account, so the money is never given back twice.
 */
export async function prepareWalletChanges(
  spreadsheetId: string,
  before: RecordWalletEffect | null,
  after: RecordWalletEffect | null,
  context: LedgerContext,
  { refresh = true }: { refresh?: boolean } = {}
): Promise<() => Promise<void>> {
  const changes = netWalletChanges(before, after)

  if (!after && context.source === 'حذف' && context.recordId) {
    for (const accountId of refundedAccountIds(spreadsheetId, context.recordId)) {
      changes.delete(accountId)
    }
  }
  if (!changes.size) return async () => undefined

  const gone = refresh
    ? await refreshWalletAccounts(spreadsheetId, changes.keys())
    : new Set<string>()
  const accounts = await fetchWalletAccounts(spreadsheetId)

  return async () => {
    const entries: LedgerEntry[] = []

    for (const [accountId, delta] of changes) {
      const account = accounts.find(item => item.id === accountId)

      if (!account || gone.has(accountId)) continue

      const balance = roundMoney(account.balance + delta)

      await updateWalletAccount(spreadsheetId, { ...account, balance }, { mergeBalance: true })
      entries.push(ledgerEntry(accountId, delta, balance, context))
    }
    await logLedger(spreadsheetId, entries)
  }
}

/**
 * Keep wallet balances in step with records: undo `before`, apply `after`, and log each
 * change in «گردش حساب». Create = (null, effect); delete = (effect, null); edit = (old, new).
 * Only the change is applied, to the balance the sheet holds now (each account is re-read first
 * when online) and, if another device moves the account before this write is sent, on top of
 * that device's balance (the write is queued as a change, see walletRowMerge).
 */
export async function applyWalletChanges(
  spreadsheetId: string,
  before: RecordWalletEffect | null,
  after: RecordWalletEffect | null,
  context: LedgerContext
): Promise<void> {
  await (
    await prepareWalletChanges(spreadsheetId, before, after, context)
  )()
}

/**
 * A record that names an account but chose not to move its balance still shows up in
 * the account history, marked «بدون اثر», with the balance left as it was.
 */
export async function logUnappliedRecord(
  spreadsheetId: string,
  type: FormType,
  values: RecordValues,
  context: LedgerContext
): Promise<void> {
  if (isWalletApplied(values)) return

  const effect = walletEffectOf(type, { ...values, [WALLET_APPLY_FIELD_ID]: '' })

  if (!effect) return

  const account = (await fetchWalletAccounts(spreadsheetId)).find(
    item => item.id === effect.accountId
  )

  if (!account) return

  await logLedger(spreadsheetId, [
    ledgerEntry(account.id, effect.delta, account.balance, context, false)
  ])
}
