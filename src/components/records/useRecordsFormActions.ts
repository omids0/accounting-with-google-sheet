import { useCallback, useState } from 'react'

import { submitRecordEdit } from './recordsMutations'
import { getFormField, type StoredRecord } from './recordsUtils'
import { useRetroactiveEntryWarning } from '../../hooks/useRetroactiveEntryWarning'
import type { CustomForm } from '../../types'

type UseRecordsFormActionsOptions = {
  forms: CustomForm[]
  loadRecords: () => Promise<void>
}

export function useRecordsFormActions({ forms, loadRecords }: UseRecordsFormActionsOptions) {
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StoredRecord | null>(null)

  const retroactiveWarning = useRetroactiveEntryWarning()

  const editingForm = editingRecord
    ? forms.find(form => form.id === editingRecord.formId)
    : undefined

  const recordDate = (record: StoredRecord): string => {
    const form = forms.find(item => item.id === record.formId)

    const fieldId = form ? getFormField(form, 'date')?.id : undefined

    return record.values[fieldId ?? 'date'] ?? ''
  }

  // Stable callbacks: each memoized records row receives these as props.
  const openEditForm = useCallback(
    (record: StoredRecord) => {
      const form = forms.find(item => item.id === record.formId)

      if (!form) return

      setEditingRecord(record)
      setShowForm(true)
    },
    [forms]
  )

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingRecord(null)
  }

  const runSubmit = async (
    formValues: Record<string, string | number>,
    vehicleExpense?: Parameters<typeof submitRecordEdit>[0]['vehicleExpense']
  ) => {
    if (!editingRecord || !editingForm) return

    setSaving(true)
    try {
      const ok = await submitRecordEdit({
        editingRecord,
        editingForm,
        formValues,
        vehicleExpense,
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

  const handleSubmit = async (
    formValues: Record<string, string | number>,
    vehicleExpense?: Parameters<typeof submitRecordEdit>[0]['vehicleExpense']
  ) => {
    if (!editingRecord || !editingForm) return

    const dateFieldId = getFormField(editingForm, 'date')?.id

    const nextDate = dateFieldId ? String(formValues[dateFieldId] ?? '') : ''

    if (
      retroactiveWarning.guard(
        [recordDate(editingRecord), nextDate],
        () => runSubmit(formValues, vehicleExpense),
        'edit'
      )
    ) {
      return
    }

    await runSubmit(formValues, vehicleExpense)
  }

  return {
    saving,
    showForm,
    editingRecord,
    editingForm,
    retroactiveWarning,
    openEditForm,
    closeForm,
    handleSubmit
  }
}
