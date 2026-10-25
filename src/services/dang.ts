import type { Dang } from '../types'
import { logItemActivity } from './activityLog'
import { dangSettlementCategory } from './buildingDang'
import { validateDangCsvCells } from './dangCsvValidate'
import { dangPrefixes, dangSettlementTitle } from './dangTitles'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { deleteLinkedExpenseRecord } from './paymentTransactions'
import type { SettleOptions, UnlinkChoice } from './settleOptions'
import { createLinkedRecordWithWallet, deleteLinkedRecordWithWallet } from './settleRecords'
import { DANG_HEADERS } from './sheetHeaders'
import { DANG_SHEET } from './sheetNames'
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow
} from './sheets'
import { getActiveWorkspaceType } from './workspace'
import { DANG_WRITER_COLUMN } from './writerColumn'
import { formatMoney } from '../utils/formatMoney'
import { parseNumeric } from '../utils/parseNumeric'
import { downloadTablePdf } from '../utils/pdf'
import { formatPaidStatus, formatPersianDate } from '../utils/pdfFormat'
import { isNumericCell, isPlainNumberCell } from '../utils/sheetValues'
import { parseWriter } from '../utils/writerColumn'

export { DANG_SHEET, DANG_HEADERS }

function parsePaid(raw: string): boolean {
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

export function rowToDang(row: string[], rowNumber: number): Dang & { rowNumber: number } {
  if (isLegacyDangRow(row)) {
    return {
      rowNumber,
      id: row[0] ?? '',
      createdAt: row[1] ?? '',
      title: row[2] ?? '',
      category: 'سایر',
      counterparty: row[3] ?? '',
      amount: parseNumeric(row[4]),
      date: row[5] ?? '',
      note: row[6] ?? '',
      paid: parsePaid(row[7] ?? ''),
      paidAt: row[8] ?? '',
      transactionRecordId: '',
      subCategory: ''
    }
  }

  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    category: row[3] ?? 'سایر',
    counterparty: row[4] ?? '',
    amount: parseNumeric(row[5]),
    date: row[6] ?? '',
    note: row[7] ?? '',
    paid: parsePaid(row[8] ?? ''),
    paidAt: row[9] ?? '',
    transactionRecordId: row[10] ?? '',
    subCategory: row[11] ?? '',
    writer: parseWriter(row[DANG_WRITER_COLUMN])
  }
}

function dangToRow(dang: Dang): string[] {
  return [
    dang.id,
    dang.createdAt,
    dang.title,
    dang.category,
    dang.counterparty,
    String(dang.amount),
    dang.date,
    dang.note,
    dang.paid ? 'بله' : 'خیر',
    dang.paidAt,
    dang.transactionRecordId ?? '',
    dang.subCategory ?? ''
  ]
}

export function sortDangs<T extends Dang>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1

    return (b.date || '').localeCompare(a.date || '')
  })
}

export async function ensureDangSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, DANG_SHEET, DANG_HEADERS)
}

export async function fetchDangs(spreadsheetId: string): Promise<(Dang & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, DANG_SHEET)

  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToDang(row, rowNumber))

  return sortDangs(items)
}

export async function createDang(
  spreadsheetId: string,
  data: {
    title: string
    category: string
    subCategory?: string
    counterparty: string
    amount: number
    date: string
    note: string
    /** A fixed id, for a debt another record owns (a building expense paid out of pocket). */
    id?: string
  }
): Promise<Dang> {
  const dang: Dang = {
    id: data.id ?? crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    category: data.category,
    subCategory: data.subCategory ?? '',
    counterparty: data.counterparty,
    amount: data.amount,
    date: data.date,
    note: data.note,
    paid: false,
    paidAt: ''
  }

  await appendSheetRow(spreadsheetId, DANG_SHEET, dangToRow(dang))
  logItemActivity(spreadsheetId, 'create', 'dang', dang.id, dang.title)

  return dang
}

export async function updateDang(
  spreadsheetId: string,
  rowNumber: number,
  dang: Dang,
  /** False for bulk rewrites (a category rename logs once itself). */
  log = true
): Promise<void> {
  await updateSheetRow(spreadsheetId, DANG_SHEET, rowNumber, dangToRow(dang))
  if (log) logItemActivity(spreadsheetId, 'update', 'dang', dang.id, dang.title)
}

export async function deleteDang(
  spreadsheetId: string,
  rowNumber: number,
  dang?: Dang,
  /** Keep the expense record its payment made (it stays as an ordinary expense). */
  keepLinkedRecords = false
): Promise<void> {
  if (dang?.transactionRecordId && !keepLinkedRecords) {
    await deleteLinkedExpenseRecord(spreadsheetId, dang.transactionRecordId)
  }
  await deleteSheetRow(spreadsheetId, DANG_SHEET, rowNumber)
  if (dang) logItemActivity(spreadsheetId, 'delete', 'dang', dang.id, dang.title)
}

export async function toggleDangPaid(
  spreadsheetId: string,
  dang: Dang & { rowNumber: number },
  paid: boolean,
  options?: SettleOptions,
  unlink?: UnlinkChoice
): Promise<Dang> {
  const building = getActiveWorkspaceType() === 'building'

  if (paid && !dang.paid) {
    const transactionRecordId = await createLinkedRecordWithWallet(
      spreadsheetId,
      'expense',
      {
        title: dangSettlementTitle(dang, building),
        amount: dang.amount,
        ...dangSettlementCategory(dang, building),
        note: dang.note
      },
      options
    )

    const updated: Dang = {
      ...dang,
      paid: true,
      paidAt: new Date().toLocaleString('fa-IR'),
      transactionRecordId
    }

    await updateSheetRow(spreadsheetId, DANG_SHEET, dang.rowNumber, dangToRow(updated))
    logItemActivity(spreadsheetId, 'pay', 'dang', dang.id, `بدهی «${dang.title}»`)

    return updated
  }

  if (!paid && dang.paid) {
    await deleteLinkedRecordWithWallet(
      spreadsheetId,
      'expense',
      dang.transactionRecordId ?? '',
      dangPrefixes(building),
      unlink
    )

    const updated: Dang = {
      ...dang,
      paid: false,
      paidAt: '',
      transactionRecordId: ''
    }

    await updateSheetRow(spreadsheetId, DANG_SHEET, dang.rowNumber, dangToRow(updated))
    logItemActivity(spreadsheetId, 'unpay', 'dang', dang.id, `بدهی «${dang.title}»`)

    return updated
  }

  return dang
}

export function unpaidDangTotal(items: Dang[]): number {
  return items.filter(d => !d.paid).reduce((sum, d) => sum + d.amount, 0)
}

export async function exportDangsCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, DANG_SHEET, DANG_HEADERS, 'بدهی.csv')
}

export async function exportDangsPdf(spreadsheetId: string): Promise<string | null> {
  const items = sortDangs(await fetchDangs(spreadsheetId))

  const headers = ['عنوان', 'دسته‌بندی', 'طرف حساب', 'مبلغ', 'تاریخ', 'وضعیت', 'توضیحات']

  const rows = items.map(item => [
    item.title,
    item.category,
    item.counterparty,
    formatMoney(item.amount),
    formatPersianDate(item.date),
    formatPaidStatus(item.paid),
    item.note
  ])

  const cellClasses = items.map(() => ['', '', '', 'pdf-cell-amount', '', '', ''])

  return downloadTablePdf({
    title: 'گزارش بدهی‌ها',
    headers,
    rows,
    filename: 'بدهی.pdf',
    cellClasses
  })
}

export async function importDangsCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(spreadsheetId, DANG_SHEET, DANG_HEADERS, csvContent, cells => {
    const { title, category, counterparty, amount, date } = validateDangCsvCells(cells)

    return dangToRow({
      id: newImportId(cells[0] ?? ''),
      createdAt: newImportTimestamp(cells[1] ?? ''),
      title,
      category,
      counterparty,
      amount,
      date,
      note: cells[7] ?? '',
      paid: parsePaid(cells[8] ?? ''),
      paidAt: cells[9] ?? '',
      transactionRecordId: cells[10] ?? '',
      subCategory: cells[11] ?? ''
    })
  })
}
