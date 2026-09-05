import { useState } from 'react'

import type { CheckFormState, CheckWithRow } from './types'
import { createCheck, updateCheck } from '../../services/checks'
import { getSettings, isConfigured } from '../../services/settings'
import type { Check } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

type UseChecksFormOptions = {
  onSaved: () => Promise<void>
}

export function useChecksForm({ onSaved }: UseChecksFormOptions) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CheckWithRow | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: CheckWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (form: CheckFormState) => {
    if (!isConfigured() || !requireAuth()) return

    if (!form.checkNumber.trim()) {
      showError('شماره چک الزامی است')

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
    if (!form.creationDate) {
      showError('تاریخ صدور الزامی است')

      return
    }
    if (!form.dueDate) {
      showError('تاریخ سررسید الزامی است')

      return
    }

    const settings = getSettings()!

    setSaving(true)
    try {
      if (editingItem) {
        const updated: Check = {
          ...editingItem,
          checkNumber: form.checkNumber.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          creationDate: form.creationDate,
          dueDate: form.dueDate
        }

        await updateCheck(settings.spreadsheetId, editingItem.rowNumber, updated)
        showSuccess('چک ویرایش شد')
      } else {
        await createCheck(settings.spreadsheetId, {
          checkNumber: form.checkNumber.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          creationDate: form.creationDate,
          dueDate: form.dueDate
        })
        showSuccess('چک جدید ثبت شد')
      }
      closeForm()
      await onSaved()
    } catch (err) {
      if (
        handleSheetError(err, {
          fallbackMessage: editingItem ? 'خطا در ویرایش چک' : 'خطا در ثبت چک'
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
