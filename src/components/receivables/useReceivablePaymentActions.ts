import { receivableActionLabels, RECEIVABLE_RECORD_PREFIX } from './paymentLabels'
import type { ReceivableWithRow } from './types'
import { getDefaultSettlementIncomeCategory } from './utils'
import {
  addReceivablePayment,
  remainingAmount,
  removeReceivablePayment,
  sortReceivables
} from '../../services/receivables'
import { usePartialPaymentActions } from '../partialPayment/usePartialPaymentActions'

type UseReceivablePaymentActionsParams = {
  setItems: React.Dispatch<React.SetStateAction<ReceivableWithRow[]>>
}

/** The shared partial-payment actions, wired to the receivable services and wording. */
export function useReceivablePaymentActions({ setItems }: UseReceivablePaymentActionsParams) {
  const actions = usePartialPaymentActions<ReceivableWithRow>({
    type: 'income',
    setItems,
    sortItems: sortReceivables,
    paymentsOf: receivable => receivable.payments,
    remainingOf: remainingAmount,
    addPayment: addReceivablePayment,
    removePayment: removeReceivablePayment,
    recordPrefix: RECEIVABLE_RECORD_PREFIX,
    settleCategory: getDefaultSettlementIncomeCategory,
    labels: receivableActionLabels
  })

  return {
    ...actions,
    paymentReceivableId: actions.paymentItemId,
    setPaymentReceivableId: actions.setPaymentItemId,
    settlementReceivableId: actions.settlementItemId,
    setSettlementReceivableId: actions.setSettlementItemId
  }
}
