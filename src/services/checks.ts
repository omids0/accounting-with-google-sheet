import type { Check, CheckDirection } from '../types'
import { logItemActivity } from './activityLog'
import {
  CHECK_DIRECTION_LABELS,
  checkRecordType,
  checkTypeLabel,
  headerDirectionColumn
} from './checkDirection'
import { checkToRow, rowToCheck } from './checkRows'
import { checkDirectionColumnForWrite } from './migrateCheckDirectionColumn'
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
import { getSheetRow } from './spreadsheetStore'
import type { DateRange } from '../utils/dateRange'
import { isDateInRange } from '../utils/dateRange'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'
import { formatPaidStatus, formatPersianDate } from '../utils/pdfFormat'
import { showInfo } from '../utils/toast'

export { exportChecksCsv, importChecksCsv } from './checksCsv'
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

  // The type is read from the column labelled «نوع چک» (none yet: every check is a payable).
  const column = headerDirectionColumn(getSheetRow(spreadsheetId, CHECKS_SHEET, 1))

  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToCheck(row, rowNumber, column))

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

  await appendSheetRow(spreadsheetId, CHECKS_SHEET, await buildCheckRow(spreadsheetId, check))
  logItemActivity(spreadsheetId, 'create', 'checks', check.id, checkTitle(check))

  return check
}

/**
 * The row to write: built on the stored one, so cells the app does not own survive, with the type
 * in the column labelled «نوع چک» only.
 */
async function buildCheckRow(
  spreadsheetId: string,
  check: Check,
  rowNumber?: number
): Promise<string[]> {
  const column = await checkDirectionColumnForWrite(spreadsheetId, check.direction)
  const stored = rowNumber ? getSheetRow(spreadsheetId, CHECKS_SHEET, rowNumber) : null

  return checkToRow(check, column, stored?.[0]?.trim() === check.id ? stored : undefined)
}

function checkTitle(check: Pick<Check, 'checkNumber' | 'direction'>): string {
  return `${checkTypeLabel(check)} ${check.checkNumber}`
}

export async function updateCheck(
  spreadsheetId: string,
  rowNumber: number,
  check: Check,
  /** False when the caller logs the change itself (a record link reopening the check). */
  log = true
): Promise<void> {
  const row = await buildCheckRow(spreadsheetId, check, rowNumber)

  await updateSheetRow(spreadsheetId, CHECKS_SHEET, rowNumber, row)
  if (log) logItemActivity(spreadsheetId, 'update', 'checks', check.id, checkTitle(check))
}

export async function deleteCheck(
  spreadsheetId: string,
  rowNumber: number,
  check?: Check,
  /** Keep the record its payment made (it stays as an ordinary income or expense). */
  keepLinkedRecords = false
): Promise<void> {
  if (check?.transactionRecordId && !keepLinkedRecords) {
    await deleteLinkedRecordWithWallet(
      spreadsheetId,
      checkRecordType(check),
      check.transactionRecordId,
      'چک: ',
      'delete'
    )
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
  // Before any record is created or deleted: a failure here must leave nothing half done.
  if (paid !== check.paid) await checkDirectionColumnForWrite(spreadsheetId, check.direction)

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
      // The day the wallet got it (the settle sheet's date, backdating included), not the tap.
      paidAt: options?.date || new Date().toLocaleString('fa-IR'),
      transactionRecordId
    }

    const row = await buildCheckRow(spreadsheetId, updated, check.rowNumber)

    await updateSheetRow(spreadsheetId, CHECKS_SHEET, check.rowNumber, row)
    logItemActivity(spreadsheetId, 'pay', 'checks', check.id, checkTitle(check))

    return updated
  }

  if (!paid && check.paid) {
    const found = await deleteLinkedRecordWithWallet(
      spreadsheetId,
      checkRecordType(check),
      check.transactionRecordId ?? '',
      'چک: ',
      unlink
    )

    if (!found && check.transactionRecordId) {
      showInfo('رکورد وصل‌شده به این چک پیدا نشد؛ فقط وضعیت چک برگشت.')
    }

    const updated: Check = {
      ...check,
      paid: false,
      paidAt: '',
      transactionRecordId: ''
    }

    const row = await buildCheckRow(spreadsheetId, updated, check.rowNumber)

    await updateSheetRow(spreadsheetId, CHECKS_SHEET, check.rowNumber, row)
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
