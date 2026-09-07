import { useState } from 'react'

import { deleteStoredRecord, submitRecordEdit } from './recordsMutations'
import { getFormField, type StoredRecord } from './recordsUtils'
import {
  retroactiveMonthLabel,
  useRetroactiveEntryWarning
} from '../../hooks/useRetroactiveEntryWarning'
import type { CustomForm } from '../../types'

type UseRecordsFormActionsOptions = {
  forms: CustomForm[]
  loadRecords: () => Promise<void>
}

export function useRecordsFormActions({ forms, loadRecords }: UseRecordsFormActionsOptions) {
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StoredRecord | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<StoredRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const retroactiveWarning = useRetroactiveEntryWarning()

  const editingForm = editingRecord
    ? forms.find(form => form.id === editingRecord.formId)
    : undefined

  const recordDate = (record: StoredRecord): string => {
    const form = forms.find(item => item.id === record.formId)

    const fieldId = form ? getFormField(form, 'date')?.id : undefined

    return record.values[fieldId ?? 'date'] ?? ''
  }

  const openEditForm = (record: StoredRecord) => {
    const form = forms.find(item => item.id === record.formId)

    if (!form) return

    setEditingRecord(record)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingRecord(null)
  }

  const openDeleteConfirm = (record: StoredRecord) => {
    setDeletingRecord(record)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingRecord(null)
  }

  const handleDelete = async () => {
    if (!deletingRecord) return

    setDeleting(true)
    try {
      const ok = await deleteStoredRecord({
        deletingRecord,
        forms,
        onSuccess: async () => {
          setDeletingRecord(null)
          await loadRecords()
        }
      })

      if (!ok) return
    } finally {
      setDeleting(false)
    }
  }

  const runSubmit = async (formValues: Record<string, string | number>) => {
    if (!editingRecord || !editingForm) return

    setSaving(true)
    try {
      const ok = await submitRecordEdit({
        editingRecord,
        editingForm,
        formValues,
        onSuccess: async () => {
          closeForm()
          await loadRecords()
        }
      })

      if (!ok) return
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (formValues: Record<string, string | number>) => {
    if (!editingRecord || !editingForm) return

    const dateFieldId = getFormField(editingForm, 'date')?.id

    const nextDate = dateFieldId ? String(formValues[dateFieldId] ?? '') : ''

    if (
      retroactiveWarning.guard(
        [recordDate(editingRecord), nextDate],
        () => runSubmit(formValues),
        'edit'
      )
    ) {
      return
    }

    await runSubmit(formValues)
  }

  const deletingRetroLabel = deletingRecord ? retroactiveMonthLabel(recordDate(deletingRecord)) : ''

  return {
    saving,
    showForm,
    editingRecord,
    deletingRecord,
    deleting,
    editingForm,
    retroactiveWarning,
    deleteMessage: deletingRetroLabel
      ? `این مورد مربوط به ${deletingRetroLabel} است. با حذف آن، موجودی اول دوره ماه‌های بعد از آن به‌صورت خودکار به‌روز می‌شود. از حذف مطمئن هستید؟`
      : 'از حذف این مورد مطمئن هستید؟',
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleSubmit
  }
}
