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

/** What the item's payments make: an instalment or a debt only spends, a receivable only earns. */
export type LinkedRecordKind = 'income' | 'expense' | 'either'

const KIND_NOUNS: Record<LinkedRecordKind, { one: string; many: string; total: string }> = {
  income: { one: 'درآمد', many: 'درآمدهای', total: 'درآمد ماه' },
  expense: { one: 'هزینهٔ', many: 'هزینه‌های', total: 'هزینه ماه' },
  either: { one: 'رکورد مالی', many: 'رکوردهای مالی', total: 'درآمد و هزینه ماه' }
}

/**
 * One short line: with the box off the records stay, and they still count in the month's
 * total, so the user knows what unticked really means.
 */
export function linkedRecordsStayLine(count: number, kind: LinkedRecordKind): string {
  const noun = KIND_NOUNS[kind]

  return count === 1
    ? `اگر تیک نزنید، ${noun.one} پرداخت در رکوردها می‌ماند و در جمع «${noun.total}» حساب می‌شود.`
    : `اگر تیک نزنید، ${noun.many} پرداخت‌ها در رکوردها می‌مانند و در جمع «${noun.total}» حساب می‌شوند.`
}

/**
 * The delete question of an item that may have made records from its payments. Items without
 * records get no checkbox. If the money really reached the accounts the wallet and the records
 * stop agreeing, so the records stay unless the box is on.
 */
export function linkedDeleteQuestion(
  label: string,
  message: string,
  linkedCount: number,
  kind: LinkedRecordKind = 'either'
): ConfirmDeleteOptions {
  if (!shouldAskLinkedRecords(linkedCount)) return { label, message }

  return {
    label,
    message: `${message}
${linkedRecordsStayLine(linkedCount, kind)}`,
    checkbox: { label: linkedRecordsCheckboxLabel(linkedCount), defaultChecked: false }
  }
}
