import { useState } from 'react'

import type { DangFormState, DangWithRow } from './types'
import { createDang, updateDang } from '../../services/dang'
import { getSettings, isConfigured } from '../../services/settings'
import type { Dang } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

type UseDangFormOptions = {
  onSaved: () => Promise<void>
}

export function useDangForm({ onSaved }: UseDangFormOptions) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<DangWithRow | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: DangWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (form: DangFormState) => {
    if (!isConfigured() || !requireAuth()) return

    if (!form.title.trim()) {
      showError('عنوان الزامی است')

      return
    }
    if (!form.category.trim()) {
      showError('دسته‌بندی الزامی است')

      return
    }
    if (!form.counterparty.trim()) {
      showError('طرف حساب الزامی است')

      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ را وارد کنید')

      return
    }
    if (!form.date) {
      showError('تاریخ الزامی است')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingItem) {
        const updated: Dang = {
          ...editingItem,
          title: form.title.trim(),
          category: form.category.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim()
        }

        await updateDang(settings.spreadsheetId, editingItem.rowNumber, updated)
        showSuccess('بدهی ویرایش شد')
      } else {
        await createDang(settings.spreadsheetId, {
          title: form.title.trim(),
          category: form.category.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim()
        })
        showSuccess('بدهی جدید ثبت شد')
      }
      closeForm()
      await onSaved()
    } catch (err) {
      if (
        handleSheetError(err, {
          fallbackMessage: editingItem ? 'خطا در ویرایش بدهی' : 'خطا در ثبت بدهی'
        })
      )
        return
    } finally {
      setSaving(false)
    }
  }

  return {
    showForm,
    editingItem,
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit
  }
}
