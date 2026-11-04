import type { MutableRefObject } from 'react'

import type { PlanWithRow } from './types'
import { useInstallmentFormActions } from './useInstallmentFormActions'
import { useInstallmentPaymentActions } from './useInstallmentPaymentActions'
import type { DateRange } from '../../utils/jalaliDate'

type UseInstallmentMutationsParams = {
  plans: PlanWithRow[]
  setPlans: React.Dispatch<React.SetStateAction<PlanWithRow[]>>
  loadPlans: () => Promise<void>
  activeRangeRef?: MutableRefObject<DateRange | null>
  revealPlanRef?: MutableRefObject<((planId: string) => void) | null>
}

export function useInstallmentMutations({
  plans,
  setPlans,
  loadPlans,
  activeRangeRef,
  revealPlanRef
}: UseInstallmentMutationsParams) {
  const payments = useInstallmentPaymentActions({ setPlans, plans })

  const formActions = useInstallmentFormActions({
    plans,
    loadPlans,
    activeRangeRef,
    revealPlanRef,
    setExpandedId: payments.setExpandedId
  })

  return {
    ...formActions,
    expandedId: payments.expandedId,
    togglingByPlan: payments.togglingByPlan,
    settleFlow: payments.settleFlow,
    handleTogglePayment: payments.handleTogglePayment,
    handlePaymentAmountSave: payments.handlePaymentAmountSave,
    handleToggleExpand: payments.handleToggleExpand,
    /** Opens one plan (search highlight) without toggling it shut. */
    expandPlan: payments.setExpandedId
  }
}
