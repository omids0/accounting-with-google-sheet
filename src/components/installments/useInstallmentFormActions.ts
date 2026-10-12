import { useCallback, useRef, useState } from 'react'

import type { InstallmentFormState, PlanWithRow } from './types'
import { useUndoableDelete } from '../../hooks/useUndoableDelete'
import {
  createInstallmentPlan,
  deleteInstallmentPlan,
  getRemovedPaymentTransactionIds,
  reconcilePaymentsOnEdit,
  updateInstallmentPlan
} from '../../services/installments'
import { deleteLinkedExpenseRecord } from '../../services/paymentTransactions'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth, requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

type UseInstallmentFormActionsParams = {
  plans: PlanWithRow[]
  loadPlans: () => Promise<void>
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
}

export function useInstallmentFormActions({
  plans,
  loadPlans,
  setExpandedId
}: UseInstallmentFormActionsParams) {
  const [showForm, setShowForm] = useState(false)

  const [editingPlan, setEditingPlan] = useState<PlanWithRow | null>(null)

  const [saving, setSaving] = useState(false)

  const closeForm = useCallback(() => {
    if (saving) return
    setShowForm(false)
    setEditingPlan(null)
  }, [saving])

  const openCreateForm = useCallback(() => {
    setEditingPlan(null)
    setShowForm(true)
  }, [])

  const openEditForm = useCallback((plan: PlanWithRow) => {
    setEditingPlan(plan)
    setShowForm(true)
  }, [])

  const handleSubmit = async (form: InstallmentFormState, computedEndDate: string) => {
    if (!isConfigured() || !requireAuth()) return

    if (form.paidUntil && form.paidUntil < form.startDate) {
      showError('تاریخ پرداخت‌شده نمی‌تواند قبل از تاریخ شروع باشد')

      return
    }
    if (form.paidUntil && computedEndDate && form.paidUntil > computedEndDate) {
      showError('تاریخ پرداخت‌شده نمی‌تواند بعد از تاریخ پایان قسط باشد')

      return
    }

    const settings = getSettings()!
    const dueDay = Number(form.dueDay)

    setSaving(true)
    try {
      if (editingPlan) {
        const reconciled = reconcilePaymentsOnEdit(editingPlan, {
          title: form.title.trim(),
          subCategory: form.subCategory.trim(),
          amount: Number(form.amount),
          count: Number(form.count),
          dueDay,
          startDate: form.startDate,
          paidUntil: form.paidUntil,
          note: form.note.trim()
        })

        if ('error' in reconciled) {
          showError(reconciled.error)

          return
        }

        const removedTransactionIds = getRemovedPaymentTransactionIds(
          editingPlan.payments,
          reconciled.payments
        )

        for (const transactionRecordId of removedTransactionIds) {
          await deleteLinkedExpenseRecord(settings.spreadsheetId, transactionRecordId)
        }
        await updateInstallmentPlan(settings.spreadsheetId, editingPlan.rowNumber, reconciled)
        showSuccess('قسط ویرایش شد')
      } else {
        await createInstallmentPlan(settings.spreadsheetId, {
          title: form.title.trim(),
          subCategory: form.subCategory.trim(),
          amount: Number(form.amount),
          count: Number(form.count),
          dueDay,
          startDate: form.startDate,
          paidUntil: form.paidUntil,
          note: form.note.trim()
        })
        showSuccess('قسط جدید ثبت شد')
      }
      closeForm()
      await loadPlans()
    } catch (err) {
      if (
        handleSheetError(err, {
          fallbackMessage: editingPlan ? 'خطا در ویرایش قسط' : 'خطا در ثبت قسط'
        })
      )
        return
    } finally {
      setSaving(false)
    }
  }

  const undoableDelete = useUndoableDelete()
  // Rows shift after every delete; the write looks its row up again by id.
  const plansRef = useRef(plans)

  plansRef.current = plans

  const requestDelete = (plan: PlanWithRow) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = plan.title.trim()

    setExpandedId(current => (current === plan.id ? null : current))
    void undoableDelete.schedule({
      id: plan.id,
      label: title ? `طرح اقساط «${title}»` : 'طرح اقساط',
      errorMessage: 'خطا در حذف قسط',
      commit: async () => {
        const current = plansRef.current.find(entry => entry.id === plan.id) ?? plan

        await deleteInstallmentPlan(spreadsheetId, current.rowNumber, current)
        await loadPlans()
      }
    })
  }

  return {
    showForm,
    editingPlan,
    /** The plans minus the one waiting in the undo window. */
    visiblePlans: undoableDelete.visible(plans),
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    requestDelete
  }
}
