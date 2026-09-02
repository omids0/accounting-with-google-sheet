import type { StoredRecord } from './recordsUtils'
import { isTokenValid } from '../../services/auth'
import { getSettings, isConfigured } from '../../services/settings'
import { deleteRecord, updateRecord } from '../../services/sheets'
import type { CustomForm } from '../../types'
import { showError, showSuccess } from '../../utils/toast'

export async function submitRecordEdit({
  editingRecord,
  editingForm,
  formValues,
  onReauth,
  onSuccess
}: {
  editingRecord: StoredRecord
  editingForm: CustomForm
  formValues: Record<string, string | number>
  onReauth?: () => void
  onSuccess: () => Promise<void>
}): Promise<boolean> {
  if (!isConfigured() || !isTokenValid()) {
    onReauth?.()

    return false
  }

  for (const field of editingForm.fields) {
    if (field.required) {
      const val = formValues[field.id]

      if (val === '' || val === undefined || val === null) {
        showError(`فیلد «${field.label}» الزامی است`)

        return false
      }
    }
  }

  const settings = getSettings()!

  try {
    await updateRecord(
      settings.spreadsheetId,
      editingForm,
      editingRecord.rowNumber,
      editingRecord.id,
      editingRecord.createdAt,
      formValues
    )
    showSuccess('تراکنش ویرایش شد')
    await onSuccess()

    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'خطا در ویرایش تراکنش'

    if (msg.includes('منقضی') || msg.includes('401')) {
      onReauth?.()

      return false
    }
    showError(msg)

    return false
  }
}

export async function deleteStoredRecord({
  deletingRecord,
  forms,
  onReauth,
  onSuccess
}: {
  deletingRecord: StoredRecord
  forms: CustomForm[]
  onReauth?: () => void
  onSuccess: () => Promise<void>
}): Promise<boolean> {
  const form = forms.find(item => item.id === deletingRecord.formId)

  if (!form) return false

  if (!isConfigured() || !isTokenValid()) {
    onReauth?.()

    return false
  }

  const settings = getSettings()!

  try {
    await deleteRecord(settings.spreadsheetId, form, deletingRecord.rowNumber)
    showSuccess('تراکنش حذف شد')
    await onSuccess()

    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'خطا در حذف تراکنش'

    if (msg.includes('منقضی') || msg.includes('401')) {
      onReauth?.()

      return false
    }
    showError(msg)

    return false
  }
}
