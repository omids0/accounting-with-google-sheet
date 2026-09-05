import { useState, useCallback } from 'react'

import type { InstallmentFormState, PlanWithRow } from './types'
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
  loadPlans: () => Promise<void>
  expandedId: string | null
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
}

export function useInstallmentFormActions({
  loadPlans,
  expandedId,
  setExpandedId
}: UseInstallmentFormActionsParams) {
  const [showForm, setShowForm] = useState(false)

  const [editingPlan, setEditingPlan] = useState<PlanWithRow | null>(null)

  const [deletingPlan, setDeletingPlan] = useState<PlanWithRow | null>(null)

  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

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

  const openDeleteConfirm = useCallback((plan: PlanWithRow) => {
    setDeletingPlan(plan)
  }, [])

  const closeDeleteConfirm = useCallback(() => {
    if (deleting) return
    setDeletingPlan(null)
  }, [deleting])

  const handleSubmit = async (form: InstallmentFormState, computedEndDate: string) => {
    if (!isConfigured() || !requireAuth()) return

    if (!form.title.trim()) {
      showError('عنوان قسط الزامی است')

      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ قسط را وارد کنید')

      return
    }
    if (!form.count || Number(form.count) < 1) {
      showError('تعداد بازپرداخت باید حداقل ۱ باشد')

      return
    }

    const dueDay = Number(form.dueDay)

    if (!dueDay || dueDay < 1 || dueDay > 31) {
      showError('موعد قسط باید بین ۱ تا ۳۱ باشد')

      return
    }
    if (!form.startDate) {
      showError('تاریخ شروع قسط الزامی است')

      return
    }
    if (form.paidUntil && form.paidUntil < form.startDate) {
      showError('تاریخ پرداخت‌شده نمی‌تواند قبل از تاریخ شروع باشد')

      return
    }
    if (form.paidUntil && computedEndDate && form.paidUntil > computedEndDate) {
      showError('تاریخ پرداخت‌شده نمی‌تواند بعد از تاریخ پایان قسط باشد')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingPlan) {
        const reconciled = reconcilePaymentsOnEdit(editingPlan, {
          title: form.title.trim(),
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

  const handleDelete = async () => {
    if (!deletingPlan) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setDeleting(true)
    try {
      await deleteInstallmentPlan(spreadsheetId, deletingPlan.rowNumber, deletingPlan)
      if (expandedId === deletingPlan.id) setExpandedId(null)
      setDeletingPlan(null)
      showSuccess('قسط حذف شد')
      await loadPlans()
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در حذف قسط' })) return
    } finally {
      setDeleting(false)
    }
  }

  return {
    showForm,
    editingPlan,
    deletingPlan,
    saving,
    deleting,
    openCreateForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleSubmit,
    handleDelete
  }
}
