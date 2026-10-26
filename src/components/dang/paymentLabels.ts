import type {
  PartialPaymentActionLabels,
  PartialPaymentSectionLabels
} from '../partialPayment/types'

/** Toasts, confirms and error fallbacks of personal debt payments. */
export const dangActionLabels: PartialPaymentActionLabels = {
  amountRequired: 'مبلغ پرداخت را وارد کنید',
  overRemaining: remaining => `مبلغ پرداخت نمی‌تواند بیشتر از مانده (${remaining}) باشد`,
  paymentAdded: 'پرداخت ثبت شد',
  addFailed: 'خطا در ثبت پرداخت',
  alreadySettled: 'این بدهی قبلاً تسویه شده است',
  settled: 'بدهی تسویه شد و هزینه ثبت شد',
  settleFailed: 'خطا در تسویه بدهی',
  paymentRemoved: 'پرداخت و تراکنش هزینه حذف شد',
  removeFailed: 'خطا در حذف پرداخت'
}

/**
 * Wording of the debt card body and its two inline forms. The settle form has no title field:
 * the service names the expense record after the debt.
 */
export const dangSectionLabels: PartialPaymentSectionLabels = {
  dateLabel: 'تاریخ بدهی',
  paymentForm: { amountLabel: 'مبلغ پرداخت', submitLabel: 'ثبت پرداخت' },
  settlementForm: { amountLabel: 'مبلغ تسویه', submitLabel: 'تسویه' }
}

/** Shown when an edit would put the debt below what was already paid. */
export function dangBelowPaidMessage(paidText: string): string {
  return `مبلغ بدهی نمی‌تواند کمتر از مجموع پرداخت‌ها (${paidText}) باشد`
}

/** Hint under an amount field of a partly paid debt. */
export function dangMinAmountHint(paidText: string): string {
  return `کمترین مبلغ ممکن ${paidText} است (مجموع پرداخت‌ها)`
}
