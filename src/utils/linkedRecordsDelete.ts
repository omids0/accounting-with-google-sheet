import type { ConfirmDeleteOptions } from './confirmDelete'
import { formatPersianNumber } from './formatMoney'
import type { Check, Dang, InstallmentPlan, Receivable } from '../types'

/** Income/expense records made by the payments of a receivable. */
export function receivableLinkedCount(receivable: Pick<Receivable, 'payments'>): number {
  return receivable.payments.filter(payment => payment.transactionRecordId).length
}

/** Expense records made by the paid instalments of a plan. */
export function installmentPlanLinkedCount(plan: Pick<InstallmentPlan, 'payments'>): number {
  return plan.payments.filter(payment => payment.transactionRecordId).length
}

/** Expense records made by the payments of a debt. */
export function dangLinkedCount(dang: Pick<Dang, 'payments'>): number {
  return dang.payments.filter(payment => payment.transactionRecordId).length
}

export function checkLinkedCount(check: Pick<Check, 'transactionRecordId'>): number {
  return check.transactionRecordId ? 1 : 0
}

/** Only items that made records get the checkbox. */
export function shouldAskLinkedRecords(count: number): boolean {
  return count > 0
}

/** The checkbox of the delete question: off by default, so the records stay unless asked. */
export function linkedRecordsCheckboxLabel(count: number): string {
  return `رکوردهای مالی مرتبط (${formatPersianNumber(count)} مورد) هم حذف شوند`
}

/**
 * The delete question of an item that may have made records from its payments. Items without
 * records get no checkbox. Months already closed change if the records go, and if the money really
 * reached the accounts the wallet and the records stop agreeing, so they stay unless the box is on.
 */
export function linkedDeleteQuestion(
  label: string,
  message: string,
  linkedCount: number
): ConfirmDeleteOptions {
  if (!shouldAskLinkedRecords(linkedCount)) return { label, message }

  return {
    label,
    message: `${message} رکوردهای مالی‌ای که از پرداخت‌هایش ساخته شده‌اند (درآمد یا هزینه) می‌مانند، مگر گزینهٔ زیر را بزنی؛ با پاک شدنشان حساب ماه‌های قبل عوض می‌شود.`,
    checkbox: { label: linkedRecordsCheckboxLabel(linkedCount), defaultChecked: false }
  }
}
