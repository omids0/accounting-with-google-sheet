import { useState, useCallback } from 'react'

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

  const [togglingKey, setTogglingKey] = useState('')

  const handleTogglePayment = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, paid: boolean) => {
      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      const key = `${plan.id}-${paymentIndex}`

      setTogglingKey(key)
      try {
        const updated = await toggleInstallmentPayment(spreadsheetId, plan, paymentIndex, paid)

        setPlans(prev =>
          prev.map(p => (p.id === plan.id ? { ...updated, rowNumber: plan.rowNumber } : p))
        )
      } catch (err) {
        if (handleSheetError(err, { fallbackMessage: 'خطا در بروزرسانی پرداخت' })) return
      } finally {
        setTogglingKey('')
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

        const updatedPlan = { ...updated, rowNumber: plan.rowNumber }

        setPlans(prev => prev.map(p => (p.id === plan.id ? updatedPlan : p)))
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
    togglingKey,
    handleTogglePayment,
    handlePaymentAmountSave,
    handleToggleExpand
  }
}
