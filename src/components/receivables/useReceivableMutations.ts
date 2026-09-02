import type { ReceivableWithRow } from './types'
import { useReceivableFormActions } from './useReceivableFormActions'
import { useReceivablePaymentActions } from './useReceivablePaymentActions'

type UseReceivableMutationsParams = {
  setItems: React.Dispatch<React.SetStateAction<ReceivableWithRow[]>>
  categories: string[]
  loadItems: () => Promise<void>
  onReauth?: () => void
  expandedId: string | null
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
}

export function useReceivableMutations({
  setItems,
  categories,
  loadItems,
  onReauth,
  expandedId,
  setExpandedId
}: UseReceivableMutationsParams) {
  const payments = useReceivablePaymentActions({ setItems, onReauth })

  const formActions = useReceivableFormActions({
    categories,
    loadItems,
    onReauth,
    expandedId,
    setExpandedId,
    clearPaymentForms: payments.clearPaymentForms
  })

  return {
    ...formActions,
    payingId: payments.payingId,
    settlingId: payments.settlingId,
    togglingPaymentId: payments.togglingPaymentId,
    paymentForm: payments.paymentForm,
    setPaymentForm: payments.setPaymentForm,
    settlementForm: payments.settlementForm,
    setSettlementForm: payments.setSettlementForm,
    handleAddPayment: payments.handleAddPayment,
    handleSettle: payments.handleSettle,
    handleRemovePayment: payments.handleRemovePayment,
    toggleExpanded: (itemId: string, expanded: boolean) => {
      setExpandedId(expanded ? null : itemId)
      payments.clearPaymentForms()
    }
  }
}
