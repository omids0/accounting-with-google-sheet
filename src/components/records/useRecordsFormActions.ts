import { useState } from 'react'

import { deleteStoredRecord, submitRecordEdit } from './recordsMutations'
import type { StoredRecord } from './recordsUtils'
import type { CustomForm } from '../../types'

type UseRecordsFormActionsOptions = {
  forms: CustomForm[]
  onReauth?: () => void
  loadRecords: () => Promise<void>
}

export function useRecordsFormActions({
  forms,
  onReauth,
  loadRecords
}: UseRecordsFormActionsOptions) {
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StoredRecord | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<StoredRecord | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string | number>>({})
  const [deleting, setDeleting] = useState(false)

  const editingForm = editingRecord
    ? forms.find(form => form.id === editingRecord.formId)
    : undefined

  const openEditForm = (record: StoredRecord) => {
    const form = forms.find(item => item.id === record.formId)

    if (!form) return

    const values: Record<string, string | number> = {}

    form.fields.forEach(field => {
      const raw = record.values[field.id] ?? ''

      if (field.type === 'number') {
        values[field.id] = raw === '' ? '' : Number(raw)
      } else {
        values[field.id] = raw
      }
    })

    setEditingRecord(record)
    setFormValues(values)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingRecord(null)
    setFormValues({})
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
        onReauth,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord || !editingForm) return

    setSaving(true)
    try {
      const ok = await submitRecordEdit({
        editingRecord,
        editingForm,
        formValues,
        onReauth,
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
    formValues,
    setFormValues,
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
