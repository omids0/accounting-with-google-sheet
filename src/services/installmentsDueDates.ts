import { addJalaliMonths, isoToJalali } from '../utils/jalaliDate'

/** Days after start in the same month that still count as the first installment due date. */
const SAME_MONTH_FIRST_DUE_GAP_DAYS = 5

export function getFirstInstallmentDueDate(startDate: string, dueDay: number): string {
  const { day: startDay } = isoToJalali(startDate)

  if (dueDay > startDay) {
    if (dueDay - startDay <= SAME_MONTH_FIRST_DUE_GAP_DAYS) {
      return addJalaliMonths(startDate, 0, dueDay)
    }

    return addJalaliMonths(startDate, 1, dueDay)
  }

  return addJalaliMonths(startDate, 1, dueDay)
}

export function getInstallmentDueDate(
  startDate: string,
  dueDay: number,
  paymentIndex: number
): string {
  const firstDue = getFirstInstallmentDueDate(startDate, dueDay)

  return addJalaliMonths(firstDue, paymentIndex, dueDay)
}

export function getInstallmentEndDate(startDate: string, count: number, dueDay: number): string {
  if (!startDate || !count || count < 1) return ''

  return getInstallmentDueDate(startDate, dueDay, count - 1)
}

export function getPaidUntilFromPlan(plan: {
  payments: { paid: boolean; dueDate: string }[]
}): string {
  const paidPayments = plan.payments.filter(payment => payment.paid)

  if (paidPayments.length === 0) return ''

  return paidPayments.reduce((max, payment) => (payment.dueDate > max ? payment.dueDate : max), '')
}
