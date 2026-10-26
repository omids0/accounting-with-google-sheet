/** Money moving in (a receivable is repaid to us) or out (we repay a debt). */
export type PartialPaymentType = 'expense' | 'income'

/** What the shared payment UI reads of one payment of a receivable or a debt. */
export type PartialPaymentLine = {
  id: string
  amount: number
  paidAt: string
  note?: string
  transactionRecordId?: string
}

/** What the add-payment service takes; the settle-the-rest call also passes title and category. */
export type PartialPaymentInput = {
  amount: number
  note?: string
  title?: string
  category?: string
}

export type PaymentFormValues = {
  amount: number | ''
  note: string
}

export type SettlementFormValues = {
  title: string
  note: string
}

/** Wording of the inline «ثبت پرداخت» form. */
export type PaymentFormLabels = {
  amountLabel: string
  submitLabel: string
}

/** Wording of the inline «تسویه» form; without `titleLabel` the title field is not shown. */
export type SettlementFormLabels = {
  titleLabel?: string
  titlePlaceholder?: string
  amountLabel: string
  submitLabel: string
}

/** Wording of the card body: the date cell of the summary and both forms. */
export type PartialPaymentSectionLabels = {
  dateLabel: string
  paymentForm: PaymentFormLabels
  settlementForm: SettlementFormLabels
}

/** Toasts, confirms and error fallbacks of `usePartialPaymentActions`. */
export type PartialPaymentActionLabels = {
  amountRequired: string
  overRemaining: (remainingText: string) => string
  paymentAdded: string
  addFailed: string
  /** Set when settling needs a title; the message shown when it is empty. */
  titleRequired?: string
  alreadySettled: string
  settled: string
  settleFailed: string
  paymentRemoved: string
  removeFailed: string
}
