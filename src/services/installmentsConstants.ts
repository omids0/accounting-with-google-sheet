import type { InstallmentPayment, InstallmentPlan } from '../types'

export const INSTALLMENTS_CACHE_TTL_MS = 30_000

export const installmentsCache = new Map<
  string,
  { expiresAt: number; plans: (InstallmentPlan & { rowNumber: number })[] }
>()

export const paymentScheduleCache = new Map<string, InstallmentPayment[]>()

/**
 * Upper bound on installments per plan (25 years monthly). The whole schedule is stored
 * as JSON in one sheet cell (50,000 char limit); a fully paid payment with a linked
 * record id is ~150 chars, so 360 could overflow the cell while 300 stays under it.
 */
export const MAX_INSTALLMENT_COUNT = 300

/**
 * Key of `paymentScheduleCache`. Prefixed by spreadsheet id so
 * `invalidateInstallmentsCache(spreadsheetId)` can drop that sheet's entries.
 */
export function paymentScheduleCacheKey(
  spreadsheetId: string,
  planId: string,
  ...parts: (string | number)[]
): string {
  return [spreadsheetId, planId, ...parts].join(':')
}

export function invalidateInstallmentsCache(spreadsheetId?: string): void {
  if (!spreadsheetId) {
    installmentsCache.clear()
    paymentScheduleCache.clear()

    return
  }

  installmentsCache.delete(spreadsheetId)
  for (const key of paymentScheduleCache.keys()) {
    if (key.startsWith(paymentScheduleCacheKey(spreadsheetId, ''))) {
      paymentScheduleCache.delete(key)
    }
  }
}

export const INSTALLMENTS_SHEET = 'اقساط'

/** Expense category of the record a paid installment creates. */
export const INSTALLMENT_EXPENSE_CATEGORY = 'قسط'

export const INSTALLMENTS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'مبلغ قسط',
  'تعداد بازپرداخت',
  'موعد در ماه',
  'تاریخ شروع',
  'توضیحات',
  'وضعیت پرداخت',
  'زیردسته'
]

export function getInstallmentPaymentAmount(
  payment: InstallmentPayment,
  plan: InstallmentPlan
): number {
  return payment.amount ?? plan.amount
}
