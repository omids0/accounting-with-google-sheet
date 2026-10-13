import type { Receivable } from '../types'
import { logActivity, logItemActivity } from './activityLog'
import { deleteLinkedIncomeRecord } from './paymentTransactions'
import {
  RECEIVABLES_HEADERS,
  RECEIVABLES_SHEET,
  getReceivableDisplayTitle,
  receivableToRow,
  rowToReceivable,
  sortReceivables
} from './receivablesRow'
import type { SettleOptions, UnlinkChoice } from './settleOptions'
import { createLinkedRecordWithWallet, deleteLinkedRecordWithWallet } from './settleRecords'
import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import { formatAmountWords } from '../utils/insightText'
import { getTodayIso } from '../utils/jalaliDate'

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
  }
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
    payments: []
  }

  await appendSheetRow(spreadsheetId, RECEIVABLES_SHEET, receivableToRow(receivable))
  logItemActivity(spreadsheetId, 'create', 'receivables', receivable.id, titleOf(receivable))

  return receivable
}

export async function addReceivablePayment(
  spreadsheetId: string,
  receivable: Receivable & { rowNumber: number },
  payment: { amount: number; note?: string; title?: string; category?: string },
  options?: SettleOptions
): Promise<Receivable> {
  const paidAt = options?.date || getTodayIso()

  const transactionRecordId = await createLinkedRecordWithWallet(
    spreadsheetId,
    'income',
    {
      title: payment.title ?? `طلب: ${getReceivableDisplayTitle(receivable)}`,
      amount: payment.amount,
      category: payment.category ?? receivable.category,
      subCategory: receivable.subCategory,
      date: paidAt,
      note: payment.note ?? receivable.note
    },
    options
  )

  const newPayment = {
    id: crypto.randomUUID(),
    amount: payment.amount,
    paidAt,
    note: payment.note ?? '',
    transactionRecordId
  }

  const updated: Receivable = {
    ...receivable,
    payments: [...receivable.payments, newPayment]
  }

  await updateSheetRow(
    spreadsheetId,
    RECEIVABLES_SHEET,
    receivable.rowNumber,
    receivableToRow(updated)
  )
  logActivity(spreadsheetId, {
    action: 'pay',
    module: 'receivables',
    itemId: receivable.id,
    summary: `${formatAmountWords(payment.amount)} از طلب «${titleOf(receivable)}» را دریافت کرد`
  })

  return updated
}

export async function removeReceivablePayment(
  spreadsheetId: string,
  receivable: Receivable & { rowNumber: number },
  paymentId: string,
  unlink?: UnlinkChoice
): Promise<Receivable> {
  const payment = receivable.payments.find(p => p.id === paymentId)

  if (!payment) return receivable

  await deleteLinkedRecordWithWallet(
    spreadsheetId,
    'income',
    payment.transactionRecordId ?? '',
    'طلب: ',
    unlink
  )

  const updated: Receivable = {
    ...receivable,
    payments: receivable.payments.filter(p => p.id !== paymentId)
  }

  await updateSheetRow(
    spreadsheetId,
    RECEIVABLES_SHEET,
    receivable.rowNumber,
    receivableToRow(updated)
  )
  logActivity(spreadsheetId, {
    action: 'unpay',
    module: 'receivables',
    itemId: receivable.id,
    summary: `دریافت ${formatAmountWords(payment.amount)} از طلب «${titleOf(
      receivable
    )}» را حذف کرد`
  })

  return updated
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
  receivable?: Receivable
): Promise<void> {
  if (receivable) {
    for (const payment of receivable.payments) {
      if (payment.transactionRecordId) {
        await deleteLinkedIncomeRecord(spreadsheetId, payment.transactionRecordId)
      }
    }
  }
  await deleteSheetRow(spreadsheetId, RECEIVABLES_SHEET, rowNumber)
  if (receivable) {
    logItemActivity(spreadsheetId, 'delete', 'receivables', receivable.id, titleOf(receivable))
  }
}
