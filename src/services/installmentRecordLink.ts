import { logItemActivity } from './activityLog'
import {
  getInstallmentPaymentAmount,
  INSTALLMENTS_SHEET,
  invalidateInstallmentsCache
} from './installmentsConstants'
import { fetchInstallmentPlans, rowToPlan, updateInstallmentPlan } from './installmentsCrud'
import { rowsMentioning, type RecordChange, type RecordLinkAdapter } from './recordLinkCore'
import type { InstallmentPayment, InstallmentPlan } from '../types'
import { toPersianDigits } from '../utils/normalizeDigits'
import { roundMoney } from '../utils/roundMoney'

type Plan = InstallmentPlan & { rowNumber: number }

const pointsAt = (payment: InstallmentPayment, recordId: string) =>
  payment.transactionRecordId === recordId

const labelOf = (plan: InstallmentPlan, payment: InstallmentPayment) =>
  `${plan.title}، قسط ${toPersianDigits(String(payment.n))}`

/**
 * Installment books: each instalment keeps ONE record id inside the book's payments cell, so the
 * payments factory (debts, receivables) does not fit. A deleted record makes the instalment
 * unpaid again; an edited one moves the date it was paid. The instalment's amount is the book's
 * schedule: a record edited to another amount only gets a note.
 */
export const installmentRecordLink: RecordLinkAdapter = {
  kind: 'installments',
  noun: 'قسط',
  recordType: 'expense',

  findByRecordId: (spreadsheetId, recordId) =>
    rowsMentioning(spreadsheetId, INSTALLMENTS_SHEET, recordId).flatMap(({ row, rowNumber }) => {
      const plan = rowToPlan(row, rowNumber, spreadsheetId)

      return plan.payments
        .filter(payment => pointsAt(payment, recordId))
        .map(payment => ({
          kind: 'installments',
          noun: 'قسط',
          itemId: plan.id,
          title: labelOf(plan, payment),
          paymentIds: [String(payment.n)]
        }))
    }),

  async onRecordDeleted(spreadsheetId, recordId) {
    return patchPlans(spreadsheetId, recordId, 'unpay', (plan, payment) => ({
      payment: { ...payment, paid: false, paidAt: '', transactionRecordId: undefined },
      note: `${labelOf(plan, payment)} دوباره پرداخت‌نشده شد، چون تراکنش وصل‌شده‌اش حذف شد.`
    }))
  },

  async onRecordUpdated(spreadsheetId, recordId, change: RecordChange) {
    return patchPlans(spreadsheetId, recordId, 'update', (plan, payment) => {
      const differs =
        change.amount !== undefined &&
        roundMoney(change.amount) !== roundMoney(getInstallmentPaymentAmount(payment, plan))

      return {
        payment:
          change.date !== undefined && change.date !== payment.paidAt
            ? { ...payment, paidAt: change.date }
            : payment,
        note: differs
          ? `مبلغ تراکنش دیگر با مبلغ ${labelOf(plan, payment)} یکی نیست؛ مبلغ قسط عوض نشد.`
          : ''
      }
    })
  }
}

/**
 * Applies `patch` to every instalment that points at the record and saves each book once. The
 * books are read again by id (not from the 30 s cache), so an instalment another device paid in
 * the meantime is kept.
 */
async function patchPlans(
  spreadsheetId: string,
  recordId: string,
  action: 'unpay' | 'update',
  patch: (plan: Plan, payment: InstallmentPayment) => { payment: InstallmentPayment; note: string }
): Promise<string[]> {
  const ids = new Set(
    rowsMentioning(spreadsheetId, INSTALLMENTS_SHEET, recordId)
      .map(({ row, rowNumber }) => rowToPlan(row, rowNumber, spreadsheetId))
      .filter(plan => plan.payments.some(payment => pointsAt(payment, recordId)))
      .map(plan => plan.id)
  )

  if (!ids.size) return []

  invalidateInstallmentsCache(spreadsheetId)

  const notes: string[] = []

  for (const plan of (await fetchInstallmentPlans(spreadsheetId)).filter(item =>
    ids.has(item.id)
  )) {
    let changed = false

    const payments = plan.payments.map(payment => {
      if (!pointsAt(payment, recordId)) return payment

      const result = patch(plan, payment)

      if (result.note) notes.push(result.note)
      if (result.payment !== payment) changed = true

      return result.payment
    })

    if (!changed) continue

    await updateInstallmentPlan(spreadsheetId, plan.rowNumber, { ...plan, payments }, false)
    logItemActivity(spreadsheetId, action, 'installments', plan.id, plan.title)
  }

  return notes
}
