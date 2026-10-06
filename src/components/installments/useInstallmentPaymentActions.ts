import { useState, useCallback, useRef } from 'react'

import type { PlanWithRow } from './types'
import {
  getInstallmentPaymentAmount,
  toggleInstallmentPayment,
  updateInstallmentPaymentAmount
} from '../../services/installments'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'

type UseInstallmentPaymentActionsParams = {
  setPlans: React.Dispatch<React.SetStateAction<PlanWithRow[]>>
}

export function useInstallmentPaymentActions({ setPlans }: UseInstallmentPaymentActionsParams) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /** planId → index of the payment whose toggle is in flight (one per plan at a time). */
  const [togglingByPlan, setTogglingByPlan] = useState<Record<string, number>>({})

  // Synchronous guard: state updates land after a re-render, so fast taps need a ref.
  const togglingPlanIds = useRef(new Set<string>())

  const handleTogglePayment = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, paid: boolean) => {
      if (togglingPlanIds.current.has(plan.id)) return

      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      togglingPlanIds.current.add(plan.id)
      setTogglingByPlan(prev => ({ ...prev, [plan.id]: paymentIndex }))
      try {
        const updated = await toggleInstallmentPayment(spreadsheetId, plan, paymentIndex, paid)

        setPlans(prev => prev.map(p => (p.id === plan.id ? updated : p)))
      } catch (err) {
        if (handleSheetError(err, { fallbackMessage: 'خطا در بروزرسانی پرداخت' })) return
      } finally {
        togglingPlanIds.current.delete(plan.id)
        setTogglingByPlan(prev => {
          const next = { ...prev }

          delete next[plan.id]

          return next
        })
      }
    },
    [setPlans]
  )

  const handlePaymentAmountSave = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, nextAmount: number) => {
      const payment = plan.payments[paymentIndex]

      if (!payment) return

      const currentAmount = getInstallmentPaymentAmount(payment, plan)

      if (nextAmount === currentAmount) return

      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      try {
        const updated = await updateInstallmentPaymentAmount(
          spreadsheetId,
          plan,
          paymentIndex,
          nextAmount
        )

        setPlans(prev => prev.map(p => (p.id === plan.id ? updated : p)))
        showSuccess('مبلغ قسط ذخیره شد')
      } catch (err) {
        if (handleSheetError(err, { fallbackMessage: 'خطا در به‌روزرسانی مبلغ' })) return
        throw err
      }
    },
    [setPlans]
  )

  const handleToggleExpand = useCallback((planId: string) => {
    setExpandedId(prev => (prev === planId ? null : planId))
  }, [])

  return {
    expandedId,
    setExpandedId,
    togglingByPlan,
    handleTogglePayment,
    handlePaymentAmountSave,
    handleToggleExpand
  }
}
