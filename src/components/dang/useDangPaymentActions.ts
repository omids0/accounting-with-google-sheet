import { dangActionLabels } from './paymentLabels'
import type { DangWithRow } from './types'
import { sortDangs } from '../../services/dang'
import { addDangPayment, removeDangPayment, settleRestOfDang } from '../../services/dangPayments'
import { dangPrefixes } from '../../services/dangTitles'
import type { SettleOptions } from '../../services/settleOptions'
import { dangRemaining } from '../../utils/dangLedger'
import { linkedIdsOf } from '../../utils/linkedIds'
import type { PartialPaymentInput } from '../partialPayment/types'
import { usePartialPaymentActions } from '../partialPayment/usePartialPaymentActions'

/** Adapts the shared add call to the debt services: «تسویه» passes a title, a part-payment does not. */
function payDang(
  spreadsheetId: string,
  dang: DangWithRow,
  payment: PartialPaymentInput,
  options?: SettleOptions
) {
  return 'title' in payment
    ? settleRestOfDang(spreadsheetId, dang, payment.note, options)
    : addDangPayment(spreadsheetId, dang, { amount: payment.amount, note: payment.note }, options)
}

/** The `transactionRecordId` of every payment of every debt: those records are settlements already. */
export function dangPaymentRecordIds(items: readonly DangWithRow[]): string[] {
  return linkedIdsOf(items, dang => dang.payments.map(payment => payment.transactionRecordId))
}

/** The shared partial-payment actions, wired to the personal debt services and wording. */
export function useDangPaymentActions(
  setItems: React.Dispatch<React.SetStateAction<DangWithRow[]>>
) {
  return usePartialPaymentActions<DangWithRow>({
    type: 'expense',
    setItems,
    sortItems: sortDangs,
    paymentsOf: dang => dang.payments,
    remainingOf: dangRemaining,
    addPayment: payDang,
    removePayment: removeDangPayment,
    recordPrefix: dangPrefixes(false),
    labels: dangActionLabels
  })
}
