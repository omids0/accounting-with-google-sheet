import { useState } from 'react'

import type { DangSplitExpenseFormState, DangSplitExpenseWithRow } from './types'
import { deleteDangSplitExpenseCascade } from '../../services/dangSplitBundle'
import {
  createDangSplitExpense,
  replaceDangSplitAllocations,
  updateDangSplitExpense
} from '../../services/dangSplitExpenses'
import type { DangSplitWeight } from '../../services/dangSplitMath'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

export function useDangSplitExpenseActions({
  groupId,
  onSaved
}: {
  groupId: string
  onSaved: () => Promise<void> | void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DangSplitExpenseWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingItem, setDeletingItem] = useState<DangSplitExpenseWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [allocatingItem, setAllocatingItem] = useState<DangSplitExpenseWithRow | null>(null)
  const [savingAllocation, setSavingAllocation] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: DangSplitExpenseWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (values: DangSplitExpenseFormState) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = values.title.trim()
    const amount = values.amount === '' ? 0 : Number(values.amount)

    if (!title) {
      showError('عنوان هزینه لازم است')

      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showError('مبلغ هزینه باید بزرگ‌تر از صفر باشد')

      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateDangSplitExpense(spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          title,
          date: values.date,
          amount,
          payerId: values.payerId,
          note: values.note.trim()
        })
        showSuccess('هزینه ویرایش شد')
      } else {
        await createDangSplitExpense(spreadsheetId, {
          groupId,
          title,
          date: values.date,
          amount,
          payerId: values.payerId,
          note: values.note.trim()
        })
        showSuccess('هزینه ثبت شد')
      }

      setShowForm(false)
      setEditingItem(null)
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ذخیره ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleDelete = async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !deletingItem) return

    setDeleting(true)
    try {
      await deleteDangSplitExpenseCascade(spreadsheetId, deletingItem)
      setDeletingItem(null)
      showSuccess('هزینه حذف شد')
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'حذف ناموفق بود')
    } finally {
      setDeleting(false)
    }
  }

  const closeAllocationModal = () => {
    if (savingAllocation) return
    setAllocatingItem(null)
  }

  const handleSaveAllocations = async (weights: DangSplitWeight[]) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !allocatingItem) return

    setSavingAllocation(true)
    try {
      await replaceDangSplitAllocations(spreadsheetId, {
        groupId,
        expenseId: allocatingItem.id,
        weights
      })
      setAllocatingItem(null)
      showSuccess('تخصیص افراد ذخیره شد')
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ذخیره تخصیص ناموفق بود')
    } finally {
      setSavingAllocation(false)
    }
  }

  return {
    showForm,
    editingItem,
    saving,
    deletingItem,
    deleting,
    allocatingItem,
    savingAllocation,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    setDeletingItem,
    closeDeleteConfirm,
    handleDelete,
    setAllocatingItem,
    closeAllocationModal,
    handleSaveAllocations
  }
}
