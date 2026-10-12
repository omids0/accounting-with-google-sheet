import type { PlanWithRow } from './types'
import { useInstallmentFormActions } from './useInstallmentFormActions'
import { useInstallmentPaymentActions } from './useInstallmentPaymentActions'

type UseInstallmentMutationsParams = {
  plans: PlanWithRow[]
  setPlans: React.Dispatch<React.SetStateAction<PlanWithRow[]>>
  loadPlans: () => Promise<void>
}

export function useInstallmentMutations({
  plans,
  setPlans,
  loadPlans
}: UseInstallmentMutationsParams) {
  const payments = useInstallmentPaymentActions({ setPlans })

  const formActions = useInstallmentFormActions({
    plans,
    loadPlans,
    setExpandedId: payments.setExpandedId
  })

  return {
    ...formActions,
    expandedId: payments.expandedId,
    togglingByPlan: payments.togglingByPlan,
    handleTogglePayment: payments.handleTogglePayment,
    handlePaymentAmountSave: payments.handlePaymentAmountSave,
    handleToggleExpand: payments.handleToggleExpand,
    /** Opens one plan (search highlight) without toggling it shut. */
    expandPlan: payments.setExpandedId
  }
}
