import type { Check, Dang, InstallmentPlan, Receivable } from '../types'

/** «رکوردهای مالی هم پاک شوند؟» when a receivable, plan, debt or check with payments is deleted. */
export type LinkedRecordsAnswer = 'delete' | 'keep'

/** Income/expense records made by the payments of a receivable. */
export function receivableLinkedCount(receivable: Pick<Receivable, 'payments'>): number {
  return receivable.payments.filter(payment => payment.transactionRecordId).length
}

/** Expense records made by the paid instalments of a plan. */
export function installmentPlanLinkedCount(plan: Pick<InstallmentPlan, 'payments'>): number {
  return plan.payments.filter(payment => payment.transactionRecordId).length
}

export function dangLinkedCount(dang: Pick<Dang, 'transactionRecordId'>): number {
  return dang.transactionRecordId ? 1 : 0
}

export function checkLinkedCount(check: Pick<Check, 'transactionRecordId'>): number {
  return check.transactionRecordId ? 1 : 0
}

/** Only items that made records get the question. */
export function shouldAskLinkedRecords(count: number): boolean {
  return count > 0
}

/**
 * What deleting the records does, in plain words: months already closed change, and if the money
 * really reached the accounts the wallet and the records stop agreeing (a record that moved an
 * account's balance also gives it back). ✕ answers «don't delete anything».
 */
export function linkedRecordsMessage(count: number, itemName = 'این مورد'): string {
  const label = count.toLocaleString('fa-IR')

  return `${itemName}: ${label} رکورد مالی (درآمد یا هزینه) از پرداخت‌هایش ساخته شده. اگر آن‌ها هم پاک شوند، حساب ماه‌های قبل عوض می‌شود؛ و اگر پولش واقعاً به حساب‌هایت رسیده بود، کیف پول و رکوردها دیگر با هم نمی‌خوانند. معمولاً بهتر است رکوردها بمانند. برای انصراف از حذف، ✕ را بزن.`
}
