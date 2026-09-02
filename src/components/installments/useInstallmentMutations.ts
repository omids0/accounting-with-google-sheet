import type { PlanWithRow } from './types'
import { useInstallmentFormActions } from './useInstallmentFormActions'
import { useInstallmentPaymentActions } from './useInstallmentPaymentActions'

type UseInstallmentMutationsParams = {
  setPlans: React.Dispatch<React.SetStateAction<PlanWithRow[]>>
  loadPlans: () => Promise<void>
  onReauth?: () => void
}

export function useInstallmentMutations({
  setPlans,
  loadPlans,
  onReauth
}: UseInstallmentMutationsParams) {
  const payments = useInstallmentPaymentActions({ setPlans, onReauth })

  const formActions = useInstallmentFormActions({
    loadPlans,
    onReauth,
    expandedId: payments.expandedId,
    setExpandedId: payments.setExpandedId
  })

  return {
    ...formActions,
    expandedId: payments.expandedId,
    togglingKey: payments.togglingKey,
    handleTogglePayment: payments.handleTogglePayment,
    handlePaymentAmountSave: payments.handlePaymentAmountSave,
    handleToggleExpand: payments.handleToggleExpand
  }
}
