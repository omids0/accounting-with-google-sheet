import { parseCreatedAtMs } from './recordDuplicates'
import { TRANSFERS_HEADERS } from './sheetHeaders'
import { TRANSFERS_SHEET } from './sheetNames'
import type { LedgerEntry } from './walletLedger'
import type { WalletAccount } from '../types'
import { formatMoney } from '../utils/formatMoney'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'
import { normalizeSheetDate } from '../utils/sheetValues'

export { TRANSFERS_SHEET, TRANSFERS_HEADERS }

/** Shown where a transfer names an account that was deleted since. */
export const DELETED_ACCOUNT_TITLE = 'حساب حذف‌شده'

/**
 * Money moved between two of the user's own wallet accounts. It is neither an income nor an
 * expense: no total, chart, report or budget counts it; only the two balances move. A transfer
 * cannot be edited — delete it and register it again.
 */
export interface Transfer {
  id: string
  /** `toLocaleString('fa-IR')` stamp, like every other tab's «زمان ثبت». */
  createdAt: string
  /** `YYYY-MM-DD` */
  date: string
  fromAccountId: string
  toAccountId: string
  /** > 0, in the app's currency. */
  amount: number
  note: string
  /** Email of whoever registered it (the «ثبت‌کننده» column); '' when unknown. */
  createdBy: string
}

export function transferToRow(transfer: Transfer): string[] {
  return [
    transfer.id,
    transfer.createdAt,
    transfer.date,
    transfer.fromAccountId,
    transfer.toAccountId,
    String(roundMoney(transfer.amount)),
    transfer.note,
    transfer.createdBy
  ]
}

/** A row without an id or an account on either side is not a transfer (a stray edit in Sheets). */
export function rowToTransfer(row: string[]): Transfer | null {
  const id = String(row[0] ?? '').trim()
  const fromAccountId = String(row[3] ?? '').trim()
  const toAccountId = String(row[4] ?? '').trim()

  if (!id || !fromAccountId || !toAccountId) return null

  return {
    id,
    createdAt: String(row[1] ?? ''),
    date: normalizeSheetDate(row[2]),
    fromAccountId,
    toAccountId,
    amount: roundMoney(parseNumeric(row[5])),
    note: String(row[6] ?? ''),
    createdBy: String(row[7] ?? '')
      .trim()
      .toLowerCase()
  }
}

/** Newest first: by date, then by when it was registered, then the later row. */
export function sortTransfers(transfers: Transfer[]): Transfer[] {
  return transfers
    .map((transfer, index) => ({ transfer, index }))
    .sort(
      (a, b) =>
        b.transfer.date.localeCompare(a.transfer.date) ||
        (parseCreatedAtMs(b.transfer.createdAt) ?? 0) -
          (parseCreatedAtMs(a.transfer.createdAt) ?? 0) ||
        b.index - a.index
    )
    .map(item => item.transfer)
}

/** What a list row says about a transfer, from the accounts as they are now. */
export function describeTransfer(
  transfer: Transfer,
  accounts: WalletAccount[]
): { title: string; subtitle: string } {
  const nameOf = (id: string) =>
    `«${accounts.find(account => account.id === id)?.title.trim() || DELETED_ACCOUNT_TITLE}»`

  return {
    title: `انتقال از ${nameOf(transfer.fromAccountId)} به ${nameOf(transfer.toAccountId)}`,
    subtitle: [
      formatMoney(transfer.amount),
      transfer.date ? formatIsoDatePersian(transfer.date) : '',
      transfer.note.trim()
    ]
      .filter(Boolean)
      .join(' · ')
  }
}

/**
 * Whether deleting the transfer can put both balances back: it cannot once one of its accounts
 * was deleted (that account's share of the money left with it).
 */
export function transferIsReversible(transfer: Transfer, accounts: WalletAccount[]): boolean {
  const has = (id: string) => accounts.some(account => account.id === id)

  return has(transfer.fromAccountId) && has(transfer.toAccountId)
}

/** How many of a transfer's two balance moves are in the books: 0 (a phantom), 1 (half-done) or 2. */
export type TransferLegState = 0 | 1 | 2

export interface TransferLegInfo {
  state: TransferLegState
  /** Accounts whose balance the transfer still moves (net of its «لغو …» reversals). */
  movedAccountIds: string[]
}

const isLegOf = (transfer: Transfer, entry: LedgerEntry): boolean =>
  entry.source === 'transfer' &&
  entry.recordId === transfer.id &&
  (entry.accountId === transfer.fromAccountId || entry.accountId === transfer.toAccountId)

/**
 * The net balance effect of the transfer on each of its two accounts, from the «گردش حساب» rows of
 * source `transfer` with the transfer's id: the moves and any earlier «لغو …» reversals together, so
 * a reversal already made is never made twice. Rows that left the balance alone (`applied` false)
 * and accounts whose net is 0 are left out.
 */
export function transferLedgerNet(transfer: Transfer, ledger: LedgerEntry[]): Map<string, number> {
  const net = new Map<string, number>()

  for (const entry of ledger) {
    if (!entry.applied || !isLegOf(transfer, entry)) continue
    net.set(entry.accountId, roundMoney((net.get(entry.accountId) ?? 0) + entry.delta))
  }
  for (const [accountId, value] of net) if (value === 0) net.delete(accountId)

  return net
}

/**
 * Which balance moves of the transfer exist. A move recorded as «بدون اثر» (a newer SMS «مانده»
 * already held it) counts as done. Fewer than 2 means the save was cut off (a closed page): the row
 * exists but the money did not move on one or both sides.
 */
export function transferLegInfo(transfer: Transfer, ledger: LedgerEntry[]): TransferLegInfo {
  const movedAccountIds = [...transferLedgerNet(transfer, ledger).keys()]
  const settled = ledger.filter(entry => !entry.applied && isLegOf(transfer, entry))
  const accounts = new Set([...movedAccountIds, ...settled.map(entry => entry.accountId)])

  return { state: accounts.size as TransferLegState, movedAccountIds }
}

export function transferLegState(transfer: Transfer, ledger: LedgerEntry[]): TransferLegState {
  return transferLegInfo(transfer, ledger).state
}

/** The activity-feed line of a transfer: «انتقال X از «A» به «B» را ثبت کرد / حذف کرد». */
export function transferActivitySummary(
  verb: 'ثبت کرد' | 'حذف کرد',
  amount: number,
  fromTitle: string,
  toTitle: string
): string {
  return `انتقال ${formatMoney(amount)} از «${fromTitle}» به «${toTitle}» را ${verb}`
}

/** Whether an activity-feed entry is a transfer between the user's own accounts. */
export function isTransferActivity(event: { module: string; summary: string }): boolean {
  return (
    event.module === 'wallet' && /^انتقال .+ از «.*» به «.*» را (ثبت|حذف) کرد$/.test(event.summary)
  )
}
