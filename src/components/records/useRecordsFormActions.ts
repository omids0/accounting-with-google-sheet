import { useCallback, useState } from 'react'

import { submitRecordEdit } from './recordsMutations'
import { getFormField, type StoredRecord } from './recordsUtils'
import { useRecordRecurring } from './useRecordRecurring'
import { useRetroactiveEntryWarning } from '../../hooks/useRetroactiveEntryWarning'
import { getSettings } from '../../services/settings'
import type { CustomForm } from '../../types'
import { useAttachmentDrafts } from '../attachments/useAttachmentDrafts'

type UseRecordsFormActionsOptions = {
  forms: CustomForm[]
  loadRecords: () => Promise<void>
}

export function useRecordsFormActions({ forms, loadRecords }: UseRecordsFormActionsOptions) {
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StoredRecord | null>(null)

  const retroactiveWarning = useRetroactiveEntryWarning()
  const [amountQuestion, setAmountQuestion] = useState<(() => void)[] | null>(null)

  const editingForm = editingRecord
    ? forms.find(form => form.id === editingRecord.formId)
    : undefined

  const recurring = useRecordRecurring(editingRecord, editingForm)

  const attachments = useAttachmentDrafts({
    open: showForm,
    resetKey: editingRecord?.id ?? '',
    fileIds: editingRecord?.attachments,
    entityId: editingRecord?.id
  })

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

  const saveEdit = async (
    formValues: Record<string, string | number>,
    vehicleExpense: Parameters<typeof submitRecordEdit>[0]['vehicleExpense'],
    alsoAmount: boolean
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
          await recurring.apply(formValues, alsoAmount).catch(() => undefined)
          await attachments.commit(
            getSettings()?.spreadsheetId ?? '',
            editingRecord.sheetName ?? editingForm.sheetName,
            editingRecord.id
          )
          closeForm()
          await loadRecords()
        }
      })

      if (!ok) return
    } finally {
      setSaving(false)
    }
  }

  // A recurring-born record whose amount changed asks once: this month only, or from now on.
  const runSubmit = async (
    formValues: Record<string, string | number>,
    vehicleExpense?: Parameters<typeof submitRecordEdit>[0]['vehicleExpense']
  ) => {
    if (!recurring.asksAmount(formValues)) return saveEdit(formValues, vehicleExpense, false)

    setAmountQuestion([
      () => void saveEdit(formValues, vehicleExpense, true),
      () => void saveEdit(formValues, vehicleExpense, false)
    ])
  }

  const amountQuestionModal = {
    open: !!amountQuestion,
    title: 'تراکنش تکراری',
    message: 'از این به بعد هم همین مبلغ؟',
    confirmLabel: 'از این به بعد هم',
    cancelLabel: 'فقط این ماه',
    onClose: () => setAmountQuestion(null),
    onConfirm: () => {
      amountQuestion?.[0]()
      setAmountQuestion(null)
    },
    onCancel: () => {
      amountQuestion?.[1]()
      setAmountQuestion(null)
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
    recurring,
    amountQuestionModal,
    attachments,
    openEditForm,
    closeForm,
    handleSubmit
  }
}
