import { useState } from 'react'

import { deleteStoredRecord, submitRecordEdit } from './recordsMutations'
import type { StoredRecord } from './recordsUtils'
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

  const editingForm = editingRecord
    ? forms.find(form => form.id === editingRecord.formId)
    : undefined

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

  const handleSubmit = async (formValues: Record<string, string | number>) => {
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

  return {
    saving,
    showForm,
    editingRecord,
    deletingRecord,
    deleting,
    editingForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleSubmit
  }
}
