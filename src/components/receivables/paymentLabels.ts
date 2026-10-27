import type {
  PartialPaymentActionLabels,
  PartialPaymentSectionLabels
} from '../partialPayment/types'

/** Toasts, confirms and error fallbacks of receivable payments. */
export const receivableActionLabels: PartialPaymentActionLabels = {
  amountRequired: 'مبلغ پرداخت را وارد کنید',
  overRemaining: remaining => `مبلغ پرداخت نمی‌تواند بیشتر از مانده (${remaining}) باشد`,
  paymentAdded: 'پرداخت ثبت شد',
  addFailed: 'خطا در ثبت پرداخت',
  titleRequired: 'عنوان درآمد الزامی است',
  alreadySettled: 'این طلب قبلاً تسویه شده است',
  settled: 'طلب تسویه شد و درآمد ثبت شد',
  settleFailed: 'خطا در تسویه طلب',
  paymentRemoved: 'پرداخت و تراکنش درآمد حذف شد',
  removeFailed: 'خطا در حذف پرداخت'
}

/** Wording of the receivable card body and its two inline forms. */
export const receivableSectionLabels: PartialPaymentSectionLabels = {
  dateLabel: 'تاریخ قرض',
  paymentForm: { amountLabel: 'مبلغ پرداخت', submitLabel: 'ثبت پرداخت' },
  settlementForm: {
    titleLabel: 'عنوان درآمد',
    titlePlaceholder: 'مثلاً: طلب: علی محمدی',
    amountLabel: 'مبلغ تسویه',
    submitLabel: 'تسویه'
  }
}

/** Title prefix of the income records a receivable payment writes. */
export const RECEIVABLE_RECORD_PREFIX = 'طلب: '
