import type { InstallmentPayment, InstallmentPlan } from '../types'

export const INSTALLMENTS_CACHE_TTL_MS = 30_000

export const installmentsCache = new Map<
  string,
  { expiresAt: number; plans: (InstallmentPlan & { rowNumber: number })[] }
>()

export const paymentScheduleCache = new Map<string, InstallmentPayment[]>()

export function invalidateInstallmentsCache(spreadsheetId?: string): void {
  if (!spreadsheetId) {
    installmentsCache.clear()
    paymentScheduleCache.clear()

    return
  }

  installmentsCache.delete(spreadsheetId)
  for (const key of paymentScheduleCache.keys()) {
    if (key.startsWith(`${spreadsheetId}:`)) {
      paymentScheduleCache.delete(key)
    }
  }
}

export const INSTALLMENTS_SHEET = 'اقساط'

export const INSTALLMENTS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'مبلغ قسط',
  'تعداد بازپرداخت',
  'موعد در ماه',
  'تاریخ شروع',
  'توضیحات',
  'وضعیت پرداخت'
]

export function getInstallmentPaymentAmount(
  payment: InstallmentPayment,
  plan: InstallmentPlan
): number {
  return payment.amount ?? plan.amount
}
