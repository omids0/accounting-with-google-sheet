import type { SettleOptions } from '../../services/settleOptions'
import type { Dang } from '../../types'
import type { PaymentFormValues, SettlementFormValues } from '../partialPayment/types'

export type DangWithRow = Dang & { rowNumber: number }

export type DangFormState = {
  title: string
  category: string
  subCategory: string
  counterparty: string
  amount: number | ''
  date: string
  note: string
}

/** What the personal debt cards need of the partial-payment actions (one object, not ten props). */
export type DangPaymentsApi = {
  payingId: string
  settlingId: string
  togglingPaymentId: string
  paymentItemId: string | null
  settlementItemId: string | null
  /** `transactionRecordId` of every payment of every debt (the settle duplicate check skips them). */
  linkedIds: readonly string[]
  setPaymentItemId: (id: string | null) => void
  setSettlementItemId: (id: string | null) => void
  handleAddPayment: (item: DangWithRow, values: PaymentFormValues, options?: SettleOptions) => void
  handleSettle: (item: DangWithRow, values: SettlementFormValues, options?: SettleOptions) => void
  handleRemovePayment: (item: DangWithRow, paymentId: string) => void
}

/** The inline amount edit of a card: typed in a field (personal) or on the dial pad (building). */
export type DangAmountEditApi = {
  savingAmountId: string
  amountEdits: Record<string, number | ''>
  onAmountChange: (item: DangWithRow, value: number | '') => void
  /** `value` is passed by the dial pad, which has the new amount in hand already. */
  onAmountBlur: (item: DangWithRow, value?: number | '') => void
}
