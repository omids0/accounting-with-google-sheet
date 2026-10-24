import type { InstallmentPayment, InstallmentPlan, Receivable, ReceivablePayment } from '../types'
import { formatMoney } from './formatMoney'
import { formatIsoDatePersian, getTodayIso } from './jalaliDate'

export function formatPaidStatus(paid: boolean): string {
  return paid ? 'پرداخت شده' : 'پرداخت نشده'
}

export function formatVaultAction(action: string): string {
  return action === 'buy' ? 'خرید' : action === 'sell' ? 'فروش' : action
}

export function formatPersianDate(iso: string): string {
  if (!iso.trim()) return '—'

  return formatIsoDatePersian(iso)
}

export function formatInstallmentPayments(
  payments: InstallmentPayment[],
  planAmount: number,
  today: string = getTodayIso()
): string {
  return payments
    .map(payment => {
      const amount = formatMoney(payment.amount ?? planAmount)

      const status = payment.paid
        ? `پرداخت شده${payment.paidAt ? ` (${formatPersianDate(payment.paidAt)})` : ''}`
        : payment.dueDate.slice(0, 10) < today
        ? 'معوق'
        : formatPaidStatus(false)

      return `قسط ${payment.n.toLocaleString(
        'fa-IR'
      )}: ${amount} · ${status} · موعد ${formatPersianDate(payment.dueDate)}`
    })
    .join('\n')
}

export function formatInstallmentPlanStatus(plan: InstallmentPlan): string {
  const paidCount = plan.payments.filter(payment => payment.paid).length

  if (paidCount >= plan.count && plan.count > 0) return 'تکمیل شده'

  return `${paidCount.toLocaleString('fa-IR')} از ${plan.count.toLocaleString('fa-IR')} پرداخت شده`
}

export function formatReceivablePayments(payments: ReceivablePayment[]): string {
  if (!payments.length) return '—'

  return payments
    .map(payment => {
      const amount = formatMoney(payment.amount)

      const date = formatPersianDate(payment.paidAt)

      return `${amount} · ${date}`
    })
    .join('\n')
}

export function formatReceivableSummary(receivable: Receivable): {
  paid: string
  remaining: string
} {
  const paid = receivable.payments.reduce((sum, payment) => sum + payment.amount, 0)

  const remaining = Math.max(receivable.amount - paid, 0)

  return {
    paid: formatMoney(paid),
    remaining: formatMoney(remaining)
  }
}
