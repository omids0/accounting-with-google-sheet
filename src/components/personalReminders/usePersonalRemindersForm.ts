import { useState } from 'react'

import type { PersonalReminderFormState, PersonalReminderWithRow } from './types'
import { createPersonalReminder, updatePersonalReminder } from '../../services/personalReminders'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

type UsePersonalRemindersFormOptions = {
  onSaved: () => Promise<void> | void
}

export function usePersonalRemindersForm({ onSaved }: UsePersonalRemindersFormOptions) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PersonalReminderWithRow | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: PersonalReminderWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (values: PersonalReminderFormState) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    if (!values.note.trim()) {
      showError('یادداشت را وارد کنید')

      return
    }
    if (!values.dueDate) {
      showError('تاریخ موعد را انتخاب کنید')

      return
    }

    const amount = values.amount === '' ? 0 : Number(values.amount)

    if (Number.isNaN(amount) || amount < 0) {
      showError('مبلغ نامعتبر است')

      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updatePersonalReminder(spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          category: values.category,
          note: values.note.trim(),
          dueDate: values.dueDate,
          recurrence: values.recurrence,
          amount,
          daysBefore: values.daysBefore,
          enabled: values.enabled
        })
        showSuccess('یادآوری به‌روزرسانی شد')
      } else {
        await createPersonalReminder(spreadsheetId, {
          category: values.category,
          note: values.note.trim(),
          dueDate: values.dueDate,
          recurrence: values.recurrence,
          amount,
          daysBefore: values.daysBefore,
          enabled: values.enabled
        })
        showSuccess('یادآوری ثبت شد')
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
