import type { Receivable, ReceivablePayment } from '../types'
import { logItemActivity } from './activityLog'
import { refreshRowFromSheet } from './freshRow'
import { deleteLinkedIncomeRecord } from './paymentTransactions'
import {
  RECEIVABLES_HEADERS,
  RECEIVABLES_SHEET,
  getReceivableDisplayTitle,
  receivableToRow,
  rowToReceivable,
  sortReceivables
} from './receivablesRow'
import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'

export { addReceivablePayment, removeReceivablePayment } from './receivablePayments'

const titleOf = (item: Receivable) => getReceivableDisplayTitle(item)

export async function ensureReceivablesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, RECEIVABLES_SHEET, RECEIVABLES_HEADERS)
}

export async function fetchReceivables(
  spreadsheetId: string
): Promise<(Receivable & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, RECEIVABLES_SHEET)

  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToReceivable(row, rowNumber))

  return sortReceivables(items)
}

export async function createReceivable(
  spreadsheetId: string,
  data: {
    title: string
    debtor: string
    category: string
    subCategory?: string
    amount: number
    borrowDate: string
    note: string
    /** Round 11: the building charge key and the debtor's counterparty id. */
    reference?: string
    debtorId?: string
    /** A receivable can be born part-paid (a charge the unit's credit paid at issue). */
    payments?: ReceivablePayment[]
  },
  /** False for bulk writes that log once themselves (a monthly charge issue). */
  log = true
): Promise<Receivable> {
  const receivable: Receivable = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    debtor: data.debtor,
    category: data.category,
    subCategory: data.subCategory ?? '',
    amount: data.amount,
    borrowDate: data.borrowDate,
    note: data.note,
    payments: data.payments ?? [],
    ...(data.reference ? { reference: data.reference } : {}),
    ...(data.debtorId ? { debtorId: data.debtorId } : {})
  }

  await appendSheetRow(spreadsheetId, RECEIVABLES_SHEET, receivableToRow(receivable))
  if (log) {
    logItemActivity(spreadsheetId, 'create', 'receivables', receivable.id, titleOf(receivable))
  }

  return receivable
}

export async function updateReceivable(
  spreadsheetId: string,
  rowNumber: number,
  receivable: Receivable,
  /** False for bulk rewrites (a category rename logs once itself). */
  log = true
): Promise<void> {
  await updateSheetRow(spreadsheetId, RECEIVABLES_SHEET, rowNumber, receivableToRow(receivable))
  if (log)
    logItemActivity(spreadsheetId, 'update', 'receivables', receivable.id, titleOf(receivable))
}

export async function deleteReceivable(
  spreadsheetId: string,
  rowNumber: number,
  receivable?: Receivable,
  /** Keep the income records its payments made (they stay as ordinary income). */
  keepLinkedRecords = false
): Promise<void> {
  if (receivable && !keepLinkedRecords) {
    // The row on the sheet may hold payments this screen has not seen yet.
    await refreshRowFromSheet(spreadsheetId, RECEIVABLES_SHEET, receivable.id)

    const fresh = (await fetchReceivables(spreadsheetId).catch(() => [])).find(
      item => item.id === receivable.id
    )

    const ids = new Set(
      [...receivable.payments, ...(fresh?.payments ?? [])]
        .map(payment => payment.transactionRecordId)
        .filter((id): id is string => Boolean(id))
    )

    for (const id of ids) await deleteLinkedIncomeRecord(spreadsheetId, id)
  }
  await deleteSheetRow(spreadsheetId, RECEIVABLES_SHEET, rowNumber)
  if (receivable) {
    logItemActivity(spreadsheetId, 'delete', 'receivables', receivable.id, titleOf(receivable))
  }
}
