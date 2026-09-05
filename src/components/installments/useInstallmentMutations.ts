import type { PlanWithRow } from './types'
import { useInstallmentFormActions } from './useInstallmentFormActions'
import { useInstallmentPaymentActions } from './useInstallmentPaymentActions'

type UseInstallmentMutationsParams = {
  setPlans: React.Dispatch<React.SetStateAction<PlanWithRow[]>>
  loadPlans: () => Promise<void>
}

export function useInstallmentMutations({ setPlans, loadPlans }: UseInstallmentMutationsParams) {
  const payments = useInstallmentPaymentActions({ setPlans })

  const formActions = useInstallmentFormActions({
    loadPlans,
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
