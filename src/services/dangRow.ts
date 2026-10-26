import { DANG_HEADERS, PAYMENTS_HEADER } from './sheetHeaders'
import { DANG_SHEET } from './sheetNames'
import { fetchSheetRows } from './sheets'
import { DANG_WRITER_COLUMN } from './writerColumn'
import type { Dang, DangPayment } from '../types'
import { dangPaidColumns, isDangSettled } from '../utils/dangLedger'
import { parseNumeric } from '../utils/parseNumeric'
import { parsePayments } from '../utils/paymentLedger'
import { isNumericCell, isPlainNumberCell } from '../utils/sheetValues'
import { parseWriter } from '../utils/writerColumn'

/** Where the payments JSON sits; the writer stays before it, at DANG_WRITER_COLUMN. */
export const DANG_PAYMENTS_COLUMN = DANG_HEADERS.indexOf(PAYMENTS_HEADER)

export function parsePaid(raw: string): boolean {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()

  return v === 'true' || v === '1' || v === 'بله' || v === 'yes'
}

/**
 * Legacy rows keep the amount in column 4 (no category column). The plain `Number()`
 * check runs first so already-detected rows are unchanged; the tolerant one only
 * rescues formatted amounts (`1,500,000`, Persian digits) where column 5 is no amount.
 */
export function isLegacyDangRow(row: string[]): boolean {
  if (isPlainNumberCell(row[4])) return true

  return isNumericCell(row[4]) && !isNumericCell(row[5])
}

interface PaymentSource {
  /** The «پرداخت‌ها» cell; empty or missing on rows written before partial payments. */
  cell?: string
  /** The legacy columns, read only when the cell is empty. */
  paid: boolean
  paidAt: string
  transactionRecordId: string
  amount: number
  id: string
}

const toPayment = (raw: Partial<DangPayment>): DangPayment => ({
  id: String(raw.id ?? ''),
  amount: Number(raw.amount) || 0,
  paidAt: String(raw.paidAt ?? ''),
  note: String(raw.note ?? ''),
  ...(raw.transactionRecordId ? { transactionRecordId: String(raw.transactionRecordId) } : {})
})

/**
 * The payments of a row. Payments in the cell win over the legacy «paid» column (an older app
 * build may have ticked it). With no cell at all, a row marked paid reads as ONE full payment;
 * that is a read-time derivation, never written back unless the row is saved, and a saved row
 * always carries an explicit JSON array, so removing the derived payment cannot resurrect it.
 */
export function dangPaymentsFromCells(source: PaymentSource): DangPayment[] {
  if (String(source.cell ?? '').trim()) {
    return parsePayments<Partial<DangPayment> & { amount: number }>(source.cell).map(toPayment)
  }

  if (!source.paid || !(source.amount > 0)) return []

  return [
    toPayment({
      id: `legacy:${source.id}`,
      amount: source.amount,
      paidAt: source.paidAt,
      transactionRecordId: source.transactionRecordId
    })
  ]
}

/** `dang` with the legacy paid columns recomputed from its payments. */
export function withDangPaidState<T extends Dang>(dang: T): T {
  return { ...dang, ...dangPaidColumns(dang) }
}

export function rowToDang(row: string[], rowNumber: number): Dang & { rowNumber: number } {
  if (isLegacyDangRow(row)) {
    const amount = parseNumeric(row[4])

    const id = row[0] ?? ''

    return withDangPaidState({
      rowNumber,
      id,
      createdAt: row[1] ?? '',
      title: row[2] ?? '',
      category: 'سایر',
      counterparty: row[3] ?? '',
      amount,
      date: row[5] ?? '',
      note: row[6] ?? '',
      paid: false,
      paidAt: '',
      transactionRecordId: '',
      subCategory: '',
      payments: dangPaymentsFromCells({
        paid: parsePaid(row[7] ?? ''),
        paidAt: row[8] ?? '',
        transactionRecordId: '',
        amount,
        id
      })
    })
  }

  const amount = parseNumeric(row[5])

  const id = row[0] ?? ''

  return withDangPaidState({
    rowNumber,
    id,
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    category: row[3] ?? 'سایر',
    counterparty: row[4] ?? '',
    amount,
    date: row[6] ?? '',
    note: row[7] ?? '',
    paid: false,
    paidAt: '',
    transactionRecordId: '',
    subCategory: row[11] ?? '',
    writer: parseWriter(row[DANG_WRITER_COLUMN]),
    payments: dangPaymentsFromCells({
      cell: row[DANG_PAYMENTS_COLUMN],
      paid: parsePaid(row[8] ?? ''),
      paidAt: row[9] ?? '',
      transactionRecordId: row[10] ?? '',
      amount,
      id
    })
  })
}

/**
 * Fourteen cells. The writer cell (index 12) carries what the row already had; the sheet layer
 * stamps the signed-in email over it on save, touching that one index only. The legacy paid
 * columns come from the payments, and an empty ledger is always written as `[]`, never ''.
 */
export function dangToRow(dang: Dang): string[] {
  const state = dangPaidColumns(dang)

  return [
    dang.id,
    dang.createdAt,
    dang.title,
    dang.category,
    dang.counterparty,
    String(dang.amount),
    dang.date,
    dang.note,
    state.paid ? 'بله' : 'خیر',
    state.paidAt,
    state.transactionRecordId,
    dang.subCategory ?? '',
    dang.writer ?? '',
    JSON.stringify(dang.payments)
  ]
}

/** Open debts first, settled ones last; newest date first inside each group. */
export function sortDangs<T extends Dang>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aSettled = isDangSettled(a)

    const bSettled = isDangSettled(b)

    if (aSettled !== bSettled) return aSettled ? 1 : -1

    return (b.date || '').localeCompare(a.date || '')
  })
}

/** Every debt on the sheet (the local mirror when loaded), settled ones last. */
export async function fetchDangs(spreadsheetId: string): Promise<(Dang & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, DANG_SHEET)

  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToDang(row, rowNumber))

  return sortDangs(items)
}
