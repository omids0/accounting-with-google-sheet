import { useState, useCallback, useRef } from 'react'

import type { PlanWithRow } from './types'
import {
  getInstallmentPaymentAmount,
  toggleInstallmentPayment,
  updateInstallmentPaymentAmount
} from '../../services/installments'
import type { SettleOptions, UnlinkChoice } from '../../services/settleOptions'
import { isLinkedForeignRecord } from '../../services/settleRecords'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { formatMoney } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import { useSettleFlow } from '../settle/useSettleFlow'

type UseInstallmentPaymentActionsParams = {
  setPlans: React.Dispatch<React.SetStateAction<PlanWithRow[]>>
  /** Every plan: their payments' records are settlements already (the duplicate check skips them). */
  plans?: PlanWithRow[]
}

export function useInstallmentPaymentActions({
  setPlans,
  plans = []
}: UseInstallmentPaymentActionsParams) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const settleFlow = useSettleFlow()

  /** planId → index of the payment whose toggle is in flight (one per plan at a time). */
  const [togglingByPlan, setTogglingByPlan] = useState<Record<string, number>>({})

  // Synchronous guard: state updates land after a re-render, so fast taps need a ref.
  const togglingPlanIds = useRef(new Set<string>())

  const handleTogglePayment = useCallback(
    async (plan: PlanWithRow, paymentIndex: number, paid: boolean) => {
      if (togglingPlanIds.current.has(plan.id)) return

      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      const payment = plan.payments[paymentIndex]
      let options: SettleOptions | null | undefined
      let unlink: UnlinkChoice | null | undefined

      // Locked while the sheet or question is open too: a second tap must not ask again.
      togglingPlanIds.current.add(plan.id)
      try {
        if (payment && paid) {
          const amount = getInstallmentPaymentAmount(payment, plan)

          options = await settleFlow.askSettle({
            type: 'expense',
            title: `پرداخت قسط ${payment.n} از ${plan.count} · ${plan.title} · ${formatMoney(
              amount
            )}`,
            amount,
            linkedIds: plans.flatMap(item =>
              item.payments.flatMap(entry =>
                entry.transactionRecordId ? [entry.transactionRecordId] : []
              )
            )
          })
          if (!options) return
        } else if (payment) {
          const recordId = payment.transactionRecordId ?? ''

          if (await isLinkedForeignRecord(spreadsheetId, 'expense', recordId, 'قسط: ')) {
            unlink = await settleFlow.askUnlink()
            if (!unlink) return
          }
        }

        setTogglingByPlan(prev => ({ ...prev, [plan.id]: paymentIndex }))
        const updated = await toggleInstallmentPayment(
          spreadsheetId,
          plan,
          paymentIndex,
          paid,
          options ?? undefined,
          unlink ?? undefined
        )

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
    [setPlans, plans, settleFlow]
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
    settleFlow,
    handleTogglePayment,
    handlePaymentAmountSave,
    handleToggleExpand
  }
}
