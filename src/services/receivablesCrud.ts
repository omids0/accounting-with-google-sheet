import type { Receivable } from '../types'
import { createLinkedIncomeRecord, deleteLinkedIncomeRecord } from './paymentTransactions'
import {
  RECEIVABLES_HEADERS,
  RECEIVABLES_SHEET,
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
import { getTodayIso } from '../utils/jalaliDate'

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
    debtor: string
    category: string
    amount: number
    borrowDate: string
    note: string
  }
): Promise<Receivable> {
  const receivable: Receivable = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    debtor: data.debtor,
    category: data.category,
    amount: data.amount,
    borrowDate: data.borrowDate,
    note: data.note,
    payments: []
  }

  await appendSheetRow(spreadsheetId, RECEIVABLES_SHEET, receivableToRow(receivable))

  return receivable
}

export async function addReceivablePayment(
  spreadsheetId: string,
  receivable: Receivable & { rowNumber: number },
  payment: { amount: number; note?: string; title?: string; category?: string }
): Promise<Receivable> {
  const paidAt = getTodayIso()

  const transactionRecordId = await createLinkedIncomeRecord(spreadsheetId, {
    title: payment.title ?? `طلب: ${receivable.debtor}`,
    amount: payment.amount,
    category: payment.category ?? receivable.category,
    date: paidAt,
    note: payment.note ?? receivable.note
  })

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

  return updated
}

export async function removeReceivablePayment(
  spreadsheetId: string,
  receivable: Receivable & { rowNumber: number },
  paymentId: string
): Promise<Receivable> {
  const payment = receivable.payments.find(p => p.id === paymentId)

  if (!payment) return receivable

  if (payment.transactionRecordId) {
    await deleteLinkedIncomeRecord(spreadsheetId, payment.transactionRecordId)
  }

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

  return updated
}

export async function updateReceivable(
  spreadsheetId: string,
  rowNumber: number,
  receivable: Receivable
): Promise<void> {
  await updateSheetRow(spreadsheetId, RECEIVABLES_SHEET, rowNumber, receivableToRow(receivable))
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
}
