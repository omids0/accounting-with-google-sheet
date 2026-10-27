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

const KIND_NOUNS: Record<LinkedRecordKind, { one: string; many: string }> = {
  income: { one: 'درآمد', many: 'درآمدهای' },
  expense: { one: 'هزینهٔ', many: 'هزینه‌های' },
  either: { one: 'رکورد مالی', many: 'رکوردهای مالی' }
}

/** One short line: what stays, and how to take it along. */
export function linkedRecordsStayLine(count: number, kind: LinkedRecordKind): string {
  const noun = KIND_NOUNS[kind]

  return count === 1
    ? `${noun.one} ساخته‌شده از پرداخت می‌ماند، مگر گزینهٔ زیر را بزنی.`
    : `${noun.many} ساخته‌شده از پرداخت‌ها می‌مانند، مگر گزینهٔ زیر را بزنی.`
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
