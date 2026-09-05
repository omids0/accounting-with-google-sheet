import type { ReceivableWithRow } from './types'
import { useReceivableFormActions } from './useReceivableFormActions'
import { useReceivablePaymentActions } from './useReceivablePaymentActions'

type UseReceivableMutationsParams = {
  setItems: React.Dispatch<React.SetStateAction<ReceivableWithRow[]>>
  loadItems: () => Promise<void>
  expandedId: string | null
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
}

export function useReceivableMutations({
  setItems,
  loadItems,
  expandedId,
  setExpandedId
}: UseReceivableMutationsParams) {
  const payments = useReceivablePaymentActions({ setItems })

  const formActions = useReceivableFormActions({
    loadItems,
    expandedId,
    setExpandedId,
    clearPaymentForms: payments.clearPaymentForms
  })

  return {
    ...formActions,
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
