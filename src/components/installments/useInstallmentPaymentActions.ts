import { useState, useCallback } from 'react'

import type { PlanWithRow } from './types'
import { isTokenValid } from '../../services/auth'
import {
  getInstallmentPaymentAmount,
  toggleInstallmentPayment,
  updateInstallmentPaymentAmount
} from '../../services/installments'
import { getSettings } from '../../services/settings'
import { showError, showSuccess } from '../../utils/toast'

type UseInstallmentPaymentActionsParams = {
  setPlans: React.Dispatch<React.SetStateAction<PlanWithRow[]>>
  onReauth?: () => void
}

export function useInstallmentPaymentActions({
  setPlans,
  onReauth
}: UseInstallmentPaymentActionsParams) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [togglingKey, setTogglingKey] = useState('')

  const handleTogglePayment = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, paid: boolean) => {
      const settings = getSettings()

      if (!settings?.spreadsheetId || !isTokenValid()) {
        onReauth?.()

        return
      }

      const key = `${plan.id}-${paymentIndex}`

      setTogglingKey(key)
      try {
        const updated = await toggleInstallmentPayment(
          settings.spreadsheetId,
          plan,
          paymentIndex,
          paid
        )

        setPlans(prev =>
          prev.map(p => (p.id === plan.id ? { ...updated, rowNumber: plan.rowNumber } : p))
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در بروزرسانی پرداخت'

        if (msg.includes('منقضی') || msg.includes('401')) {
          onReauth?.()

          return
        }
        showError(msg)
      } finally {
        setTogglingKey('')
      }
    },
    [onReauth, setPlans]
  )

  const handlePaymentAmountSave = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, nextAmount: number) => {
      const payment = plan.payments[paymentIndex]

      if (!payment) return

      const currentAmount = getInstallmentPaymentAmount(payment, plan)

      if (nextAmount === currentAmount) return

      const settings = getSettings()

      if (!settings?.spreadsheetId || !isTokenValid()) {
        onReauth?.()

        return
      }

      try {
        const updated = await updateInstallmentPaymentAmount(
          settings.spreadsheetId,
          plan,
          paymentIndex,
          nextAmount
        )

        const updatedPlan = { ...updated, rowNumber: plan.rowNumber }

        setPlans(prev => prev.map(p => (p.id === plan.id ? updatedPlan : p)))
        showSuccess('مبلغ قسط ذخیره شد')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی مبلغ'

        if (msg.includes('منقضی') || msg.includes('401')) {
          onReauth?.()

          return
        }
        showError(msg)
        throw err
      }
    },
    [onReauth, setPlans]
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
