import { useState } from 'react'

import type { ReceivableWithRow } from './types'
import { getDefaultSettlementIncomeCategory } from './utils'
import {
  addReceivablePayment,
  remainingAmount,
  removeReceivablePayment,
  sortReceivables
} from '../../services/receivables'
import type { SettleOptions, UnlinkChoice } from '../../services/settleOptions'
import { isLinkedForeignRecord } from '../../services/settleRecords'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { formatMoney } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import { useSettleFlow } from '../settle/useSettleFlow'

type UseReceivablePaymentActionsParams = {
  setItems: React.Dispatch<React.SetStateAction<ReceivableWithRow[]>>
}

export function useReceivablePaymentActions({ setItems }: UseReceivablePaymentActionsParams) {
  const [payingId, setPayingId] = useState('')

  const settleFlow = useSettleFlow()

  const [settlingId, setSettlingId] = useState('')

  const [togglingPaymentId, setTogglingPaymentId] = useState('')

  const [paymentReceivableId, setPaymentReceivableId] = useState<string | null>(null)

  const [settlementReceivableId, setSettlementReceivableId] = useState<string | null>(null)

  const clearPaymentForms = () => {
    setPaymentReceivableId(null)
    setSettlementReceivableId(null)
  }

  const handleAddPayment = async (
    receivable: ReceivableWithRow,
    values: { amount: number | ''; note: string },
    options?: SettleOptions
  ) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const payAmount = Number(values.amount)

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
      const updated = await addReceivablePayment(
        spreadsheetId,
        receivable,
        {
          amount: payAmount,
          note: values.note.trim()
        },
        options
      )

      setItems(prev =>
        sortReceivables(
          prev.map(item =>
            item.id === receivable.id ? { ...updated, rowNumber: receivable.rowNumber } : item
          )
        )
      )
      setPaymentReceivableId(null)
      showSuccess('پرداخت ثبت شد')
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در ثبت پرداخت' })) return
    } finally {
      setPayingId('')
    }
  }

  const handleSettle = async (
    receivable: ReceivableWithRow,
    values: { title: string; note: string },
    options?: SettleOptions
  ) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = values.title.trim()

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
      const updated = await addReceivablePayment(
        spreadsheetId,
        receivable,
        {
          amount: remaining,
          title,
          category: getDefaultSettlementIncomeCategory(),
          note: values.note.trim()
        },
        options
      )

      setItems(prev =>
        sortReceivables(
          prev.map(item =>
            item.id === receivable.id ? { ...updated, rowNumber: receivable.rowNumber } : item
          )
        )
      )
      setSettlementReceivableId(null)
      showSuccess('طلب تسویه شد و درآمد ثبت شد')
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در تسویه طلب' })) return
    } finally {
      setSettlingId('')
    }
  }

  const handleRemovePayment = async (receivable: ReceivableWithRow, paymentId: string) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    // A payment linked to a record the user already had: ask before deleting that record too.
    const recordId = receivable.payments.find(p => p.id === paymentId)?.transactionRecordId ?? ''
    let unlink: UnlinkChoice | null | undefined

    if (await isLinkedForeignRecord(spreadsheetId, 'income', recordId, 'طلب: ')) {
      unlink = await settleFlow.askUnlink()
      if (!unlink) return
    }

    setTogglingPaymentId(paymentId)
    try {
      const updated = await removeReceivablePayment(
        spreadsheetId,
        receivable,
        paymentId,
        unlink ?? undefined
      )

      setItems(prev =>
        sortReceivables(
          prev.map(item =>
            item.id === receivable.id ? { ...updated, rowNumber: receivable.rowNumber } : item
          )
        )
      )
      showSuccess('پرداخت و تراکنش درآمد حذف شد')
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در حذف پرداخت' })) return
    } finally {
      setTogglingPaymentId('')
    }
  }

  return {
    settleFlow,
    payingId,
    settlingId,
    togglingPaymentId,
    paymentReceivableId,
    setPaymentReceivableId,
    settlementReceivableId,
    setSettlementReceivableId,
    clearPaymentForms,
    handleAddPayment,
    handleSettle,
    handleRemovePayment
  }
}
