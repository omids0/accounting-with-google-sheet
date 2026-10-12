import { WALLET_LEDGER_HEADERS } from './sheetHeaders'
import { WALLET_LEDGER_SHEET } from './sheetNames'
import { appendSheetRow, fetchSheetRows } from './sheets'
import { getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import { getTodayIso } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'
import { showError } from '../utils/toast'

/** One row per wallet balance change, with the balance right after it. */
export { WALLET_LEDGER_SHEET, WALLET_LEDGER_HEADERS }

export type LedgerSource = 'ثبت' | 'ویرایش' | 'حذف' | 'پیامک' | 'اصلاح دستی' | 'موجودی اولیه'

/** What caused a balance change, as shown in the account history. */
export interface LedgerContext {
  title: string
  date: string
  source: LedgerSource
  recordId?: string
}

export interface LedgerEntry extends LedgerContext {
  id: string
  createdAt: string
  accountId: string
  delta: number
  balanceAfter: number
  /** false: the record names the account but chose not to move its balance. */
  applied: boolean
}

const APPLIED_YES = 'بله'
const APPLIED_NO = 'خیر'

export function ledgerEntry(
  accountId: string,
  delta: number,
  balanceAfter: number,
  context: LedgerContext,
  applied = true
): LedgerEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    accountId,
    delta,
    balanceAfter,
    applied,
    title: context.title,
    date: context.date,
    source: context.source,
    recordId: context.recordId ?? ''
  }
}

export function ledgerRow(entry: LedgerEntry): string[] {
  return [
    entry.id,
    entry.createdAt,
    entry.accountId,
    entry.date,
    String(entry.delta),
    String(entry.balanceAfter),
    entry.title,
    entry.source,
    entry.recordId ?? '',
    entry.applied ? APPLIED_YES : APPLIED_NO
  ]
}

export function rowToLedgerEntry(row: string[]): LedgerEntry {
  return {
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    accountId: row[2] ?? '',
    date: row[3] ?? '',
    delta: parseNumeric(row[4]),
    balanceAfter: parseNumeric(row[5]),
    title: row[6] ?? '',
    source: (row[7] ?? '') as LedgerSource,
    recordId: row[8] ?? '',
    applied: (row[9] ?? '').trim() !== APPLIED_NO
  }
}

export async function appendLedgerEntries(
  spreadsheetId: string,
  entries: LedgerEntry[]
): Promise<void> {
  // A tab not hydrated yet would take the first appended row as its header.
  if (getSheetAllRows(spreadsheetId, WALLET_LEDGER_SHEET) === null) {
    setSheetAllRows(spreadsheetId, WALLET_LEDGER_SHEET, [WALLET_LEDGER_HEADERS])
  }
  for (const entry of entries) {
    await appendSheetRow(spreadsheetId, WALLET_LEDGER_SHEET, ledgerRow(entry))
  }
}

/** Appends entries; a failure only warns, because the balance itself is already saved. */
export async function logLedger(spreadsheetId: string, entries: LedgerEntry[]): Promise<void> {
  if (!entries.length) return

  await appendLedgerEntries(spreadsheetId, entries).catch(() =>
    showError('موجودی به‌روز شد ولی گردش حساب ثبت نشد')
  )
}

const BALANCE_SET_TITLES = {
  'اصلاح دستی': 'اصلاح دستی موجودی',
  'موجودی اولیه': 'موجودی اولیه حساب'
} as const

/** A balance typed in by the user (edit, or a new account's starting balance). */
export async function logBalanceSet(
  spreadsheetId: string,
  accountId: string,
  before: number,
  after: number,
  source: keyof typeof BALANCE_SET_TITLES
): Promise<void> {
  if (after === before) return

  await logLedger(spreadsheetId, [
    ledgerEntry(accountId, after - before, after, {
      title: BALANCE_SET_TITLES[source],
      date: getTodayIso(),
      source
    })
  ])
}

/** History of one account, newest first (rows are only ever appended). */
export async function fetchLedger(
  spreadsheetId: string,
  accountId: string
): Promise<LedgerEntry[]> {
  const rows = await fetchSheetRows(spreadsheetId, WALLET_LEDGER_SHEET)

  return rows
    .filter(row => String(row[2] ?? '').trim() === accountId)
    .map(rowToLedgerEntry)
    .reverse()
}
