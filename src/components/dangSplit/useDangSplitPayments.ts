import { useState } from 'react'

import type { DangSplitPersonWithRow } from './types'
import { setDangSplitPersonPaid } from '../../services/dangSplitPeople'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

/** ثبت پرداخت جزئی و تسویه کامل هر فرد در تب جمع‌بندی */
export function useDangSplitPayments({
  people,
  summary,
  onSaved
}: {
  people: DangSplitPersonWithRow[]
  summary: DangSplitGroupSummary
  onSaved: () => Promise<void> | void
}) {
  const [paymentPersonId, setPaymentPersonId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const savePaid = async (personId: string, paid: number) => {
    const spreadsheetId = requireSpreadsheetId()
    const person = people.find(item => item.id === personId)

    if (!spreadsheetId || !person) return

    const share = summary.people.find(item => item.personId === personId)?.share ?? 0

    setSavingId(personId)
    try {
      await setDangSplitPersonPaid(spreadsheetId, person, paid, share)
      setPaymentPersonId(null)
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ثبت پرداخت ناموفق بود')
    } finally {
      setSavingId(null)
    }
  }

  const addPayment = async (personId: string, amount: number | '') => {
    const value = amount === '' ? 0 : Number(amount)

    if (!Number.isFinite(value) || value <= 0) {
      showError('مبلغ پرداخت باید بزرگ‌تر از صفر باشد')

      return
    }

    const person = people.find(item => item.id === personId)

    if (!person) return

    await savePaid(personId, person.paidAmount + value)
    showSuccess('پرداخت ثبت شد')
  }

  const settleFull = async (personId: string) => {
    const share = summary.people.find(item => item.personId === personId)?.share ?? 0

    await savePaid(personId, share)
    showSuccess('تسویه کامل ثبت شد')
  }

  const undoPayments = async (personId: string) => {
    await savePaid(personId, 0)
    showSuccess('پرداخت‌های این فرد پاک شد')
  }

  return {
    paymentPersonId,
    savingId,
    openPaymentForm: setPaymentPersonId,
    closePaymentForm: () => setPaymentPersonId(null),
    addPayment,
    settleFull,
    undoPayments
  }
}
