import { appendSheetRow, fetchSheetRows } from './sheets'
import { parseNumeric } from '../utils/parseNumeric'

/** One row per wallet balance change, with the balance right after it. */
export const WALLET_LEDGER_SHEET = 'گردش حساب'

export const WALLET_LEDGER_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'شناسه حساب',
  'تاریخ',
  'مبلغ',
  'موجودی بعد',
  'عنوان',
  'منبع',
  'شناسه رکورد',
  'اثر'
]

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
  for (const entry of entries) {
    await appendSheetRow(spreadsheetId, WALLET_LEDGER_SHEET, ledgerRow(entry))
  }
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
