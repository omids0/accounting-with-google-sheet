import type { InstallmentPayment, InstallmentPlan } from '../types'
import { getInstallmentPaymentAmount } from './installmentsConstants'
import { getInstallmentDueDate } from './installmentsDueDates'
import { applyPaidUntilToPayments } from './installmentsSchedule'
import type { DateRange } from '../utils/dateRange'
import { isDateInRange } from '../utils/dateRange'

export function isInstallmentPlanComplete(plan: InstallmentPlan): boolean {
  return plan.count > 0 && plan.payments.every(p => p.paid)
}

export function getNextInstallmentDueDate(plan: InstallmentPlan): string {
  const next = plan.payments.find(p => !p.paid)

  return next?.dueDate ?? plan.payments[plan.payments.length - 1]?.dueDate ?? ''
}

export function getInstallmentDueDateInRange(plan: InstallmentPlan, range: DateRange): string {
  const inRange = plan.payments
    .filter(payment => isDateInRange(payment.dueDate, range))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  if (inRange.length === 0) return getNextInstallmentDueDate(plan)

  const unpaid = inRange.find(payment => !payment.paid)

  return (unpaid ?? inRange[0]).dueDate
}

export function sortInstallmentPlans<T extends InstallmentPlan>(plans: T[]): T[] {
  return [...plans].sort((a, b) => {
    const aComplete = isInstallmentPlanComplete(a)

    const bComplete = isInstallmentPlanComplete(b)

    if (aComplete !== bComplete) return aComplete ? 1 : -1

    const aDue = getNextInstallmentDueDate(a)

    const bDue = getNextInstallmentDueDate(b)

    return aDue.localeCompare(bDue)
  })
}

export function sortInstallmentPayments(
  payments: InstallmentPayment[]
): { payment: InstallmentPayment; index: number }[] {
  return payments
    .map((payment, index) => ({ payment, index }))
    .sort((a, b) => {
      if (a.payment.paid !== b.payment.paid) return a.payment.paid ? 1 : -1

      return a.payment.dueDate.localeCompare(b.payment.dueDate)
    })
}

export function unpaidInstallmentCount(plan: InstallmentPlan): number {
  return plan.payments.filter(p => !p.paid).length
}

export function unpaidInstallmentCountInRange(plan: InstallmentPlan, range: DateRange): number {
  return plan.payments.filter(p => !p.paid && isDateInRange(p.dueDate, range)).length
}

export function installmentCountInRange(plan: InstallmentPlan, range: DateRange): number {
  return plan.payments.filter(p => isDateInRange(p.dueDate, range)).length
}

/** Plan is relevant when at least one installment is due in the range (e.g. current month). */
export function hasInstallmentDueInRange(plan: InstallmentPlan, range: DateRange): boolean {
  return installmentCountInRange(plan, range) > 0
}

/** Active plans stay visible even when the next due date is outside the current month. */
export function isInstallmentPlanVisible(plan: InstallmentPlan, range: DateRange): boolean {
  if (!isInstallmentPlanComplete(plan)) return true

  return hasInstallmentDueInRange(plan, range)
}

export function totalInstallmentAmount(plan: InstallmentPlan): number {
  return plan.payments.reduce((sum, payment) => sum + getInstallmentPaymentAmount(payment, plan), 0)
}

export function paidInstallmentAmount(plan: InstallmentPlan): number {
  return plan.payments
    .filter(payment => payment.paid)
    .reduce((sum, payment) => sum + getInstallmentPaymentAmount(payment, plan), 0)
}

export function remainingInstallmentAmount(plan: InstallmentPlan): number {
  return Math.max(0, totalInstallmentAmount(plan) - paidInstallmentAmount(plan))
}

export function getInstallmentPaymentForDueDate(
  plan: InstallmentPlan,
  dueDate: string
): InstallmentPayment | undefined {
  if (!dueDate) return undefined

  return plan.payments.find(payment => payment.dueDate === dueDate)
}

export function getInstallmentDuePaymentAmount(
  plan: InstallmentPlan,
  dueDate: string
): number | null {
  const payment = getInstallmentPaymentForDueDate(plan, dueDate)

  if (!payment) return null

  return getInstallmentPaymentAmount(payment, plan)
}

export function unpaidInstallmentAmount(plan: InstallmentPlan): number {
  return plan.payments
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + getInstallmentPaymentAmount(p, plan), 0)
}

export function unpaidInstallmentAmountInRange(plan: InstallmentPlan, range: DateRange): number {
  return plan.payments
    .filter(p => !p.paid && isDateInRange(p.dueDate, range))
    .reduce((sum, p) => sum + getInstallmentPaymentAmount(p, plan), 0)
}

export function installmentAmountInRange(plan: InstallmentPlan, range: DateRange): number {
  return plan.payments
    .filter(p => isDateInRange(p.dueDate, range))
    .reduce((sum, p) => sum + getInstallmentPaymentAmount(p, plan), 0)
}

export function totalUnpaidInstallments(plans: InstallmentPlan[], range: DateRange): number {
  return plans.reduce((sum, plan) => sum + unpaidInstallmentAmountInRange(plan, range), 0)
}

export function totalInstallmentsInRange(plans: InstallmentPlan[], range: DateRange): number {
  return plans.reduce((sum, plan) => sum + installmentAmountInRange(plan, range), 0)
}

export function reconcilePaymentsOnEdit(
  plan: InstallmentPlan,
  data: {
    count: number
    dueDay: number
    amount: number
    title: string
    note: string
    startDate: string
    paidUntil?: string
  }
): InstallmentPlan | { error: string } {
  if (data.count < plan.payments.filter(p => p.paid).length) {
    return { error: 'تعداد بازپرداخت نمی‌تواند کمتر از اقساط پرداخت‌شده باشد' }
  }

  const removedPaid = plan.payments.slice(data.count).some(p => p.paid)

  if (removedPaid) {
    return { error: 'نمی‌توان اقساط پرداخت‌شده را حذف کرد' }
  }

  const payments: InstallmentPayment[] = []

  for (let i = 0; i < data.count; i++) {
    const n = i + 1

    const existing = plan.payments[i]

    if (existing) {
      payments.push({
        ...existing,
        n,
        amount: data.amount,
        dueDate: getInstallmentDueDate(data.startDate, data.dueDay, i)
      })
    } else {
      payments.push({
        n,
        paid: false,
        paidAt: '',
        dueDate: getInstallmentDueDate(data.startDate, data.dueDay, i),
        amount: data.amount
      })
    }
  }

  const syncedPayments = applyPaidUntilToPayments(payments, data.paidUntil ?? '')

  return {
    ...plan,
    title: data.title,
    amount: data.amount,
    count: data.count,
    dueDay: data.dueDay,
    startDate: data.startDate,
    note: data.note,
    payments: syncedPayments
  }
}

export function getRemovedPaymentTransactionIds(
  previousPayments: InstallmentPayment[],
  nextPayments: InstallmentPayment[]
): string[] {
  const ids: string[] = []

  for (const previous of previousPayments) {
    const next = nextPayments.find(payment => payment.n === previous.n)

    if (previous.paid && previous.transactionRecordId && next && !next.paid) {
      ids.push(previous.transactionRecordId)
    }
  }

  return ids
}
