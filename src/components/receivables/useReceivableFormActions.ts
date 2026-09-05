import { useState } from 'react'

import type { ReceivableFormState, ReceivableWithRow } from './types'
import {
  createReceivable,
  deleteReceivable,
  paidAmount,
  updateReceivable
} from '../../services/receivables'
import { getSettings, isConfigured } from '../../services/settings'
import { requireAuth, requireSpreadsheetId } from '../../utils/authGuard'
import { getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

type UseReceivableFormActionsParams = {
  categories: string[]
  loadItems: () => Promise<void>
  expandedId: string | null
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>
  clearPaymentForms: () => void
}

export function useReceivableFormActions({
  categories,
  loadItems,
  expandedId,
  setExpandedId,
  clearPaymentForms
}: UseReceivableFormActionsParams) {
  const [showForm, setShowForm] = useState(false)

  const [editingItem, setEditingItem] = useState<ReceivableWithRow | null>(null)

  const [deletingItem, setDeletingItem] = useState<ReceivableWithRow | null>(null)

  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState<ReceivableFormState>({
    debtor: '',
    category: '',
    amount: '',
    borrowDate: getTodayIso(),
    note: ''
  })

  const resetCreateForm = () => {
    setForm({
      debtor: '',
      category: categories[0] ?? '',
      amount: '',
      borrowDate: getTodayIso(),
      note: ''
    })
  }

  const openCreateForm = () => {
    setEditingItem(null)
    resetCreateForm()
    setShowForm(true)
  }

  const openEditForm = (item: ReceivableWithRow) => {
    setEditingItem(item)
    setForm({
      debtor: item.debtor,
      category: item.category,
      amount: item.amount,
      borrowDate: item.borrowDate,
      note: item.note
    })
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
    resetCreateForm()
  }

  const openDeleteConfirm = (item: ReceivableWithRow) => {
    setDeletingItem(item)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured() || !requireAuth()) return

    if (!form.debtor.trim()) {
      showError('نام شخص یا ارگان الزامی است')

      return
    }
    if (!form.category.trim()) {
      showError('دسته‌بندی الزامی است')

      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ را وارد کنید')

      return
    }
    if (!form.borrowDate) {
      showError('تاریخ قرض الزامی است')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingItem) {
        const nextAmount = Number(form.amount)

        if (nextAmount < paidAmount(editingItem)) {
          showError('مبلغ نمی‌تواند کمتر از مجموع پرداخت‌ها باشد')

          return
        }

        const updated = {
          ...editingItem,
          debtor: form.debtor.trim(),
          category: form.category.trim(),
          amount: nextAmount,
          borrowDate: form.borrowDate,
          note: form.note.trim()
        }

        await updateReceivable(settings.spreadsheetId, editingItem.rowNumber, updated)
        showSuccess('طلب ویرایش شد')
      } else {
        await createReceivable(settings.spreadsheetId, {
          debtor: form.debtor.trim(),
          category: form.category.trim(),
          amount: Number(form.amount),
          borrowDate: form.borrowDate,
          note: form.note.trim()
        })
        showSuccess('طلب جدید ثبت شد')
      }
      closeForm()
      await loadItems()
    } catch (err) {
      if (
        handleSheetError(err, {
          fallbackMessage: editingItem ? 'خطا در ویرایش طلب' : 'خطا در ثبت طلب'
        })
      )
        return
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setDeleting(true)
    try {
      await deleteReceivable(spreadsheetId, deletingItem.rowNumber, deletingItem)
      if (expandedId === deletingItem.id) setExpandedId(null)
      clearPaymentForms()
      setDeletingItem(null)
      showSuccess('طلب حذف شد')
      await loadItems()
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در حذف طلب' })) return
    } finally {
      setDeleting(false)
    }
  }

  return {
    showForm,
    editingItem,
    deletingItem,
    saving,
    deleting,
    form,
    setForm,
    openCreateForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleSubmit,
    handleDelete
  }
}
