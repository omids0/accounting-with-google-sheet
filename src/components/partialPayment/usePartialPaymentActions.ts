import { useState } from 'react'

import type {
  PartialPaymentActionLabels,
  PartialPaymentInput,
  PartialPaymentLine,
  PartialPaymentType,
  PaymentFormValues,
  SettlementFormValues
} from './types'
import type { SettleOptions, UnlinkChoice } from '../../services/settleOptions'
import { isLinkedForeignRecord, type SettlePrefix } from '../../services/settleRecords'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { formatMoney } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import { useSettleFlow } from '../settle/useSettleFlow'
import { useReadOnly } from '../ui/readOnly'

type PartialPaymentItem = { id: string; rowNumber: number }

/** What a service returns: the item as the sheet holds it, with the row number left to the screen. */
type Saved<T extends PartialPaymentItem> = Omit<T, 'rowNumber'>

type UsePartialPaymentActionsParams<T extends PartialPaymentItem> = {
  /** Money in (a receivable) or out (a debt): picks the record type of the unpay check. */
  type: PartialPaymentType
  setItems: React.Dispatch<React.SetStateAction<T[]>>
  sortItems: (items: T[]) => T[]
  paymentsOf: (item: T) => readonly PartialPaymentLine[]
  remainingOf: (item: T) => number
  addPayment: (
    spreadsheetId: string,
    item: T,
    payment: PartialPaymentInput,
    options?: SettleOptions
  ) => Promise<Saved<T>>
  removePayment: (
    spreadsheetId: string,
    item: T,
    paymentId: string,
    unlink?: UnlinkChoice
  ) => Promise<Saved<T>>
  /** Title prefix of the records the module writes (the foreign-record check looks for it). */
  recordPrefix: SettlePrefix
  /** The category of the record that settling the rest creates. */
  settleCategory?: () => string
  labels: PartialPaymentActionLabels
}

/**
 * Add, settle-the-rest and remove of the partial payments of a list item (a receivable or a
 * debt): the remaining guard, the unpay and unlink questions, the toasts, and which payment
 * form is open. The services and the Persian wording come in through the params.
 */
export function usePartialPaymentActions<T extends PartialPaymentItem>({
  type,
  setItems,
  sortItems,
  paymentsOf,
  remainingOf,
  addPayment,
  removePayment,
  recordPrefix,
  settleCategory,
  labels
}: UsePartialPaymentActionsParams<T>) {
  const readOnly = useReadOnly()

  const settleFlow = useSettleFlow()

  const [payingId, setPayingId] = useState('')

  const [settlingId, setSettlingId] = useState('')

  const [togglingPaymentId, setTogglingPaymentId] = useState('')

  const [paymentItemId, setPaymentItemId] = useState<string | null>(null)

  const [settlementItemId, setSettlementItemId] = useState<string | null>(null)

  const clearPaymentForms = () => {
    setPaymentItemId(null)
    setSettlementItemId(null)
  }

  const replaceItem = (original: T, updated: Saved<T>) =>
    setItems(prev =>
      sortItems(
        prev.map(item =>
          item.id === original.id ? ({ ...updated, rowNumber: original.rowNumber } as T) : item
        )
      )
    )

  const handleAddPayment = async (item: T, values: PaymentFormValues, options?: SettleOptions) => {
    if (readOnly) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const payAmount = Number(values.amount)

    if (!payAmount || payAmount <= 0) {
      showError(labels.amountRequired)

      return
    }

    const remaining = remainingOf(item)

    if (payAmount > remaining) {
      showError(labels.overRemaining(formatMoney(remaining)))

      return
    }

    setPayingId(item.id)
    try {
      const updated = await addPayment(
        spreadsheetId,
        item,
        { amount: payAmount, note: values.note.trim() },
        options
      )

      replaceItem(item, updated)
      setPaymentItemId(null)
      showSuccess(labels.paymentAdded)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: labels.addFailed })) return
    } finally {
      setPayingId('')
    }
  }

  const handleSettle = async (item: T, values: SettlementFormValues, options?: SettleOptions) => {
    if (readOnly) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = values.title.trim()

    if (labels.titleRequired && !title) {
      showError(labels.titleRequired)

      return
    }

    const remaining = remainingOf(item)

    if (remaining <= 0) {
      showError(labels.alreadySettled)

      return
    }

    setSettlingId(item.id)
    try {
      const updated = await addPayment(
        spreadsheetId,
        item,
        { amount: remaining, title, category: settleCategory?.(), note: values.note.trim() },
        options
      )

      replaceItem(item, updated)
      setSettlementItemId(null)
      showSuccess(labels.settled)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: labels.settleFailed })) return
    } finally {
      setSettlingId('')
    }
  }

  const handleRemovePayment = async (item: T, paymentId: string) => {
    if (readOnly) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    // A payment linked to a record the user already had: ask before deleting that record too.
    const recordId = paymentsOf(item).find(p => p.id === paymentId)?.transactionRecordId ?? ''
    let unlink: UnlinkChoice | null | undefined

    if (!(await settleFlow.askUnpay(Boolean(recordId)))) return

    if (await isLinkedForeignRecord(spreadsheetId, type, recordId, recordPrefix)) {
      unlink = await settleFlow.askUnlink()
      if (!unlink) return
    }

    setTogglingPaymentId(paymentId)
    try {
      const updated = await removePayment(spreadsheetId, item, paymentId, unlink ?? undefined)

      replaceItem(item, updated)
      showSuccess(labels.paymentRemoved)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: labels.removeFailed })) return
    } finally {
      setTogglingPaymentId('')
    }
  }

  return {
    settleFlow,
    payingId,
    settlingId,
    togglingPaymentId,
    paymentItemId,
    setPaymentItemId,
    settlementItemId,
    setSettlementItemId,
    clearPaymentForms,
    handleAddPayment,
    handleSettle,
    handleRemovePayment
  }
}
