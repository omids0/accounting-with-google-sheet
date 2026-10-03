import { useState } from 'react'

import type { DangSplitPersonWithRow } from './types'
import { setDangSplitPersonPaid } from '../../services/dangSplitPeople'
import type { DangSplitGroupSummary, DangSplitPersonSummary } from '../../types/dangSplit'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

/**
 * تسویه نقدی هر فرد در تب جمع‌بندی. بدهکار پول می‌دهد (عدد مثبت) و طلبکار پول
 * پس می‌گیرد (عدد منفی)؛ هدف هر دو رساندن مانده به صفر است.
 */
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

  const personSummary = (personId: string): DangSplitPersonSummary | undefined =>
    summary.people.find(item => item.personId === personId)

  const savePaid = async (personId: string, paid: number) => {
    const spreadsheetId = requireSpreadsheetId()
    const person = people.find(item => item.id === personId)

    if (!spreadsheetId || !person) return false

    const current = personSummary(personId)
    const due = (current?.share ?? 0) - (current?.credit ?? 0)

    setSavingId(personId)
    try {
      await setDangSplitPersonPaid(spreadsheetId, person, paid, due)
      setPaymentPersonId(null)
      await onSaved()

      return true
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ثبت پرداخت ناموفق بود')

      return false
    } finally {
      setSavingId(null)
    }
  }

  /** ثبت پرداخت یا دریافت جزئی؛ جهت از روی بدهکار/طلبکار بودن فرد تعیین می‌شود. */
  const addPayment = async (personId: string, amount: number | '') => {
    const value = amount === '' ? 0 : Number(amount)

    if (!Number.isFinite(value) || value <= 0) {
      showError('مبلغ باید بزرگ‌تر از صفر باشد')

      return
    }

    const person = people.find(item => item.id === personId)
    const current = personSummary(personId)

    if (!person || !current) return

    const signed = current.balance < 0 ? -value : value

    if (await savePaid(personId, person.paidAmount + signed)) {
      showSuccess(current.balance < 0 ? 'دریافت ثبت شد' : 'پرداخت ثبت شد')
    }
  }

  const settleFull = async (personId: string) => {
    const current = personSummary(personId)
    const due = (current?.share ?? 0) - (current?.credit ?? 0)

    if (await savePaid(personId, due)) {
      showSuccess('تسویه کامل ثبت شد')
    }
  }

  const undoPayments = async (personId: string) => {
    if (await savePaid(personId, 0)) {
      showSuccess('تسویه این فرد لغو شد')
    }
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
