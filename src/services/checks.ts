import type { Check, CheckDirection } from '../types'
import { logItemActivity } from './activityLog'
import { CHECK_ATTACHMENT_COLUMN } from './attachmentColumn'
import {
  CHECK_DIRECTION_COLUMN,
  CHECK_DIRECTION_LABELS,
  checkRecordType,
  parseCheckDirection
} from './checkDirection'
import { checkToRow, parsePaid, rowToCheck } from './checkRows'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { deleteLinkedRecord } from './paymentTransactions'
import type { SettleOptions, UnlinkChoice } from './settleOptions'
import { createLinkedRecordWithWallet, deleteLinkedRecordWithWallet } from './settleRecords'
import { CHECKS_HEADERS } from './sheetHeaders'
import { CHECKS_SHEET } from './sheetNames'
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow
} from './sheets'
import {
  parseAttachmentIds,
  serializeAttachmentIds,
  withAttachmentCell
} from '../utils/attachmentIds'
import type { DateRange } from '../utils/dateRange'
import { isDateInRange } from '../utils/dateRange'
import { formatMoney } from '../utils/formatMoney'
import { parseNumeric } from '../utils/parseNumeric'
import { downloadTablePdf } from '../utils/pdf'
import { formatPaidStatus, formatPersianDate } from '../utils/pdfFormat'

export { CHECKS_SHEET, CHECKS_HEADERS }

/** Category of the record a passed check creates: an expense when paid, income when received. */
export const CHECK_EXPENSE_CATEGORY = 'چک'
export const CHECK_INCOME_CATEGORY = 'چک'

export function sortChecks<T extends Check>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1

    return (a.dueDate || '').localeCompare(b.dueDate || '')
  })
}

export async function ensureChecksSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, CHECKS_SHEET, CHECKS_HEADERS)
}

export async function fetchChecks(
  spreadsheetId: string
): Promise<(Check & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, CHECKS_SHEET)

  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToCheck(row, rowNumber))

  return sortChecks(items)
}

export async function createCheck(
  spreadsheetId: string,
  data: {
    checkNumber: string
    direction: CheckDirection
    counterparty: string
    subCategory?: string
    amount: number
    creationDate: string
    dueDate: string
  }
): Promise<Check> {
  const check: Check = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    checkNumber: data.checkNumber,
    direction: data.direction,
    counterparty: data.counterparty,
    subCategory: data.subCategory ?? '',
    amount: data.amount,
    creationDate: data.creationDate,
    dueDate: data.dueDate,
    paid: false,
    paidAt: ''
  }

  await appendSheetRow(spreadsheetId, CHECKS_SHEET, checkToRow(check))
  logItemActivity(spreadsheetId, 'create', 'checks', check.id, checkTitle(check))

  return check
}

function checkTitle(check: Pick<Check, 'checkNumber'>): string {
  return `چک ${check.checkNumber}`
}

export async function updateCheck(
  spreadsheetId: string,
  rowNumber: number,
  check: Check
): Promise<void> {
  await updateSheetRow(spreadsheetId, CHECKS_SHEET, rowNumber, checkToRow(check))
  logItemActivity(spreadsheetId, 'update', 'checks', check.id, checkTitle(check))
}

export async function deleteCheck(
  spreadsheetId: string,
  rowNumber: number,
  check?: Check
): Promise<void> {
  if (check?.transactionRecordId) {
    await deleteLinkedRecord(spreadsheetId, checkRecordType(check), check.transactionRecordId)
  }
  await deleteSheetRow(spreadsheetId, CHECKS_SHEET, rowNumber)
  if (check) logItemActivity(spreadsheetId, 'delete', 'checks', check.id, checkTitle(check))
}

export async function toggleCheckPaid(
  spreadsheetId: string,
  check: Check & { rowNumber: number },
  paid: boolean,
  options?: SettleOptions,
  unlink?: UnlinkChoice
): Promise<Check> {
  if (paid && !check.paid) {
    const transactionRecordId = await createLinkedRecordWithWallet(
      spreadsheetId,
      checkRecordType(check),
      {
        title: `چک: ${check.checkNumber} — ${check.counterparty}`,
        amount: check.amount,
        category: CHECK_EXPENSE_CATEGORY,
        subCategory: check.subCategory,
        note: `سررسید: ${check.dueDate}`
      },
      options
    )

    const updated: Check = {
      ...check,
      paid: true,
      paidAt: new Date().toLocaleString('fa-IR'),
      transactionRecordId
    }

    await updateSheetRow(spreadsheetId, CHECKS_SHEET, check.rowNumber, checkToRow(updated))
    logItemActivity(spreadsheetId, 'pay', 'checks', check.id, checkTitle(check))

    return updated
  }

  if (!paid && check.paid) {
    await deleteLinkedRecordWithWallet(
      spreadsheetId,
      checkRecordType(check),
      check.transactionRecordId ?? '',
      'چک: ',
      unlink
    )

    const updated: Check = {
      ...check,
      paid: false,
      paidAt: '',
      transactionRecordId: ''
    }

    await updateSheetRow(spreadsheetId, CHECKS_SHEET, check.rowNumber, checkToRow(updated))
    logItemActivity(spreadsheetId, 'unpay', 'checks', check.id, checkTitle(check))

    return updated
  }

  return check
}

/** Sum of the checks due in `range`; `direction` narrows it to payables or received ones. */
export function totalChecksInRange(
  checks: Check[],
  range: DateRange,
  direction?: CheckDirection
): number {
  return checks
    .filter(c => (!direction || c.direction === direction) && isDateInRange(c.dueDate, range))
    .reduce((sum, c) => sum + c.amount, 0)
}

export function totalUnpaidChecksInRange(
  checks: Check[],
  range: DateRange,
  direction?: CheckDirection
): number {
  return totalChecksInRange(
    checks.filter(c => !c.paid),
    range,
    direction
  )
}

export async function exportChecksCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, CHECKS_SHEET, CHECKS_HEADERS, 'چک‌ها.csv')
}

export async function exportChecksPdf(spreadsheetId: string): Promise<string | null> {
  const checks = sortChecks(await fetchChecks(spreadsheetId))

  const headers = [
    'شماره چک',
    'نوع',
    'طرف حساب',
    'مبلغ',
    'تاریخ صدور',
    'تاریخ سررسید',
    'وضعیت',
    'تاریخ پرداخت'
  ]

  const rows = checks.map(check => [
    check.checkNumber,
    CHECK_DIRECTION_LABELS[check.direction],
    check.counterparty,
    formatMoney(check.amount),
    formatPersianDate(check.creationDate),
    formatPersianDate(check.dueDate),
    formatPaidStatus(check.paid),
    check.paid ? formatPersianDate(check.paidAt) : '—'
  ])

  const cellClasses = checks.map(() => ['', '', '', 'pdf-cell-amount', '', '', '', ''])

  return downloadTablePdf({
    title: 'گزارش چک‌ها',
    headers,
    rows,
    filename: 'چک‌ها.pdf',
    cellClasses
  })
}

export async function importChecksCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(spreadsheetId, CHECKS_SHEET, CHECKS_HEADERS, csvContent, cells => {
    const checkNumber = (cells[2] ?? '').trim()

    const counterparty = (cells[3] ?? '').trim()

    if (!checkNumber && !counterparty) return null

    const row = checkToRow({
      id: newImportId(cells[0] ?? ''),
      createdAt: newImportTimestamp(cells[1] ?? ''),
      checkNumber,
      direction: parseCheckDirection(cells[CHECK_DIRECTION_COLUMN]),
      counterparty,
      amount: parseNumeric(cells[4]),
      creationDate: cells[5] ?? '',
      dueDate: cells[6] ?? '',
      paid: parsePaid(cells[7] ?? ''),
      paidAt: cells[8] ?? '',
      transactionRecordId: cells[9] ?? '',
      subCategory: cells[10] ?? ''
    })

    return withAttachmentCell(
      row,
      CHECK_ATTACHMENT_COLUMN,
      serializeAttachmentIds(parseAttachmentIds(cells[CHECK_ATTACHMENT_COLUMN]))
    )
  })
}
