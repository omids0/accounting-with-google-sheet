import type { Receivable } from '../types'
import { logActivity, logItemActivity } from './activityLog'
import { refreshRowFromSheet } from './freshRow'
import { ReceivablePaymentError } from './receivablePaymentError'
import {
  getReceivableDisplayTitle,
  paidAmount,
  receivableToRow,
  remainingAmount,
  rowToReceivable
} from './receivablesRow'
import type { SettleOptions, UnlinkChoice } from './settleOptions'
import { createLinkedRecordWithWallet, deleteLinkedRecordWithWallet } from './settleRecords'
import { RECEIVABLES_SHEET } from './sheetNames'
import { fetchSheetRows, updateSheetRow } from './sheets'
import { formatMoney } from '../utils/formatMoney'
import { formatAmountWords } from '../utils/insightText'
import { getTodayIso } from '../utils/jalaliDate'

type ReceivableRow = Receivable & { rowNumber: number }

const titleOf = (item: Receivable) => getReceivableDisplayTitle(item)

const MISSING = 'این طلب پیدا نشد؛ شاید حذف شده باشد.'

/**
 * The receivable as the sheet holds it now, found by id: its row is read from Google Sheets into
 * the local mirror first (offline, or with a write still queued, the mirror is what there is).
 * Payments are computed on this copy, never on the screen's: another device may have added one.
 */
export async function readFreshReceivable(
  spreadsheetId: string,
  receivableId: string
): Promise<ReceivableRow> {
  if ((await refreshRowFromSheet(spreadsheetId, RECEIVABLES_SHEET, receivableId)) === 'missing') {
    throw new ReceivablePaymentError(MISSING, 'missing')
  }

  const rows = await fetchSheetRows(spreadsheetId, RECEIVABLES_SHEET)

  const index = rows.findIndex(row => String(row[0] ?? '').trim() === receivableId)

  if (index < 0) throw new ReceivablePaymentError(MISSING, 'missing')

  return rowToReceivable(rows[index], index + 2)
}

/**
 * Receives a piece of a receivable: 0 < amount <= remaining, checked on the sheet's row. Creates
 * the income record that is the money arriving (nothing when `options.linkRecordId` points at an
 * existing one), then writes the row.
 */
export async function addReceivablePayment(
  spreadsheetId: string,
  receivable: ReceivableRow,
  payment: { amount: number; note?: string; title?: string; category?: string },
  options?: SettleOptions
): Promise<Receivable> {
  const fresh = await readFreshReceivable(spreadsheetId, receivable.id)

  const remaining = remainingAmount(fresh)

  if (!(payment.amount > 0)) {
    throw new ReceivablePaymentError('مبلغ دریافت باید بیشتر از صفر باشد.', 'amount')
  }
  if (payment.amount > remaining) {
    throw new ReceivablePaymentError(
      `مبلغ دریافت از باقی‌ماندهٔ طلب (${formatMoney(remaining)}) بیشتر است.`,
      'over-remaining'
    )
  }

  const paidAt = options?.date || getTodayIso()

  const transactionRecordId = await createLinkedRecordWithWallet(
    spreadsheetId,
    'income',
    {
      title: payment.title ?? `طلب: ${titleOf(fresh)}`,
      amount: payment.amount,
      category: payment.category ?? fresh.category,
      subCategory: fresh.subCategory,
      date: paidAt,
      note: payment.note ?? fresh.note
    },
    options
  )

  const updated: ReceivableRow = {
    ...fresh,
    payments: [
      ...fresh.payments,
      {
        id: crypto.randomUUID(),
        amount: payment.amount,
        paidAt,
        note: payment.note ?? '',
        transactionRecordId
      }
    ]
  }

  await updateSheetRow(spreadsheetId, RECEIVABLES_SHEET, fresh.rowNumber, receivableToRow(updated))
  logActivity(spreadsheetId, {
    action: 'pay',
    module: 'receivables',
    itemId: fresh.id,
    summary: `${formatAmountWords(payment.amount)} از طلب «${titleOf(fresh)}» را دریافت کرد`
  })

  return updated
}

/** Takes one payment back: its income record goes with its balance effect (see `unlink`). */
export async function removeReceivablePayment(
  spreadsheetId: string,
  receivable: ReceivableRow,
  paymentId: string,
  unlink?: UnlinkChoice
): Promise<Receivable> {
  const fresh = await readFreshReceivable(spreadsheetId, receivable.id)

  const payment = fresh.payments.find(item => item.id === paymentId)

  if (!payment) return fresh

  await deleteLinkedRecordWithWallet(
    spreadsheetId,
    'income',
    payment.transactionRecordId ?? '',
    'طلب: ',
    unlink
  )

  const updated: ReceivableRow = {
    ...fresh,
    payments: fresh.payments.filter(item => item.id !== paymentId)
  }

  await updateSheetRow(spreadsheetId, RECEIVABLES_SHEET, fresh.rowNumber, receivableToRow(updated))
  logActivity(spreadsheetId, {
    action: 'unpay',
    module: 'receivables',
    itemId: fresh.id,
    summary: `دریافت ${formatAmountWords(payment.amount)} از طلب «${titleOf(fresh)}» را حذف کرد`
  })

  return updated
}

/**
 * Saves the editable fields of a receivable (title, amount, dates, note, ...) from an edit form.
 * The payments are never taken from `receivable`: the form's copy may be stale, so the row is
 * re-read by id and keeps ITS payments. Only add/removeReceivablePayment write payments here.
 */
export async function saveReceivableFields(
  spreadsheetId: string,
  receivable: ReceivableRow
): Promise<void> {
  const fresh = await readFreshReceivable(spreadsheetId, receivable.id)

  if (receivable.amount < paidAmount(fresh)) {
    throw new ReceivablePaymentError(
      `مبلغ طلب نمی‌تواند کمتر از ${formatMoney(paidAmount(fresh))} (دریافتی تا حالا) باشد`,
      'below-paid'
    )
  }

  const saved: Receivable = { ...receivable, payments: fresh.payments }

  await updateSheetRow(spreadsheetId, RECEIVABLES_SHEET, fresh.rowNumber, receivableToRow(saved))
  logItemActivity(spreadsheetId, 'update', 'receivables', saved.id, titleOf(saved))
}
