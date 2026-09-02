import { useState } from 'react'

import type { PaymentFormState, ReceivableWithRow, SettlementFormState } from './types'
import { getDefaultSettlementIncomeCategory } from './utils'
import { isTokenValid } from '../../services/auth'
import {
  addReceivablePayment,
  remainingAmount,
  removeReceivablePayment,
  sortReceivables
} from '../../services/receivables'
import { getSettings } from '../../services/settings'
import { formatMoney } from '../../utils/formatMoney'
import { showError, showSuccess } from '../../utils/toast'

type UseReceivablePaymentActionsParams = {
  setItems: React.Dispatch<React.SetStateAction<ReceivableWithRow[]>>
  onReauth?: () => void
}

export function useReceivablePaymentActions({
  setItems,
  onReauth
}: UseReceivablePaymentActionsParams) {
  const [payingId, setPayingId] = useState('')

  const [settlingId, setSettlingId] = useState('')

  const [togglingPaymentId, setTogglingPaymentId] = useState('')

  const [paymentForm, setPaymentForm] = useState<PaymentFormState | null>(null)

  const [settlementForm, setSettlementForm] = useState<SettlementFormState | null>(null)

  const clearPaymentForms = () => {
    setPaymentForm(null)
    setSettlementForm(null)
  }

  const handleAddPayment = async (receivable: ReceivableWithRow) => {
    if (!paymentForm || paymentForm.receivableId !== receivable.id) return

    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    const payAmount = Number(paymentForm.amount)

    if (!payAmount || payAmount <= 0) {
      showError('مبلغ پرداخت را وارد کنید')

      return
    }

    const remaining = remainingAmount(receivable)

    if (payAmount > remaining) {
      showError(`مبلغ پرداخت نمی‌تواند بیشتر از مانده (${formatMoney(remaining)}) باشد`)

      return
    }

    setPayingId(receivable.id)
    try {
      const updated = await addReceivablePayment(settings.spreadsheetId, receivable, {
        amount: payAmount,
        note: paymentForm.note.trim()
      })

      setItems(prev =>
        sortReceivables(
          prev.map(item =>
            item.id === receivable.id ? { ...updated, rowNumber: receivable.rowNumber } : item
          )
        )
      )
      setPaymentForm(null)
      showSuccess('پرداخت ثبت شد')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت پرداخت'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setPayingId('')
    }
  }

  const handleSettle = async (receivable: ReceivableWithRow) => {
    if (!settlementForm || settlementForm.receivableId !== receivable.id) return

    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    const title = settlementForm.title.trim()

    if (!title) {
      showError('عنوان درآمد الزامی است')

      return
    }

    const remaining = remainingAmount(receivable)

    if (remaining <= 0) {
      showError('این طلب قبلاً تسویه شده است')

      return
    }

    setSettlingId(receivable.id)
    try {
      const updated = await addReceivablePayment(settings.spreadsheetId, receivable, {
        amount: remaining,
        title,
        category: getDefaultSettlementIncomeCategory(),
        note: settlementForm.note.trim()
      })

      setItems(prev =>
        sortReceivables(
          prev.map(item =>
            item.id === receivable.id ? { ...updated, rowNumber: receivable.rowNumber } : item
          )
        )
      )
      setSettlementForm(null)
      showSuccess('طلب تسویه شد و درآمد ثبت شد')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در تسویه طلب'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setSettlingId('')
    }
  }

  const handleRemovePayment = async (receivable: ReceivableWithRow, paymentId: string) => {
    const settings = getSettings()

    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.()

      return
    }

    setTogglingPaymentId(paymentId)
    try {
      const updated = await removeReceivablePayment(settings.spreadsheetId, receivable, paymentId)

      setItems(prev =>
        sortReceivables(
          prev.map(item =>
            item.id === receivable.id ? { ...updated, rowNumber: receivable.rowNumber } : item
          )
        )
      )
      showSuccess('پرداخت و تراکنش درآمد حذف شد')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف پرداخت'

      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.()

        return
      }
      showError(msg)
    } finally {
      setTogglingPaymentId('')
    }
  }

  return {
    payingId,
    settlingId,
    togglingPaymentId,
    paymentForm,
    setPaymentForm,
    settlementForm,
    setSettlementForm,
    clearPaymentForms,
    handleAddPayment,
    handleSettle,
    handleRemovePayment
  }
}
