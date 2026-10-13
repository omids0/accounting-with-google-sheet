import type { ReceivableWithRow } from './types'
import { useReceivableFormActions } from './useReceivableFormActions'
import { useReceivablePaymentActions } from './useReceivablePaymentActions'

type UseReceivableMutationsParams = {
  items: ReceivableWithRow[]
  setItems: React.Dispatch<React.SetStateAction<ReceivableWithRow[]>>
  loadItems: () => Promise<void>
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
}

export function useReceivableMutations({
  items,
  setItems,
  loadItems,
  setExpandedId
}: UseReceivableMutationsParams) {
  const payments = useReceivablePaymentActions({ setItems })

  const formActions = useReceivableFormActions({
    items,
    loadItems,
    setExpandedId,
    clearPaymentForms: payments.clearPaymentForms
  })

  return {
    ...formActions,
    settleFlow: payments.settleFlow,
    payingId: payments.payingId,
    settlingId: payments.settlingId,
    togglingPaymentId: payments.togglingPaymentId,
    paymentReceivableId: payments.paymentReceivableId,
    setPaymentReceivableId: payments.setPaymentReceivableId,
    settlementReceivableId: payments.settlementReceivableId,
    setSettlementReceivableId: payments.setSettlementReceivableId,
    handleAddPayment: payments.handleAddPayment,
    handleSettle: payments.handleSettle,
    handleRemovePayment: payments.handleRemovePayment,
    toggleExpanded: (itemId: string, expanded: boolean) => {
      setExpandedId(expanded ? null : itemId)
      payments.clearPaymentForms()
    }
  }
}
