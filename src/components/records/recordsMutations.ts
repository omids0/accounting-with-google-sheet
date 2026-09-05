import type { StoredRecord } from './recordsUtils'
import { getSettings, isConfigured } from '../../services/settings'
import { deleteRecord, updateRecord } from '../../services/sheets'
import type { CustomForm } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

export async function submitRecordEdit({
  editingRecord,
  editingForm,
  formValues,
  onSuccess
}: {
  editingRecord: StoredRecord
  editingForm: CustomForm
  formValues: Record<string, string | number>
  onSuccess: () => Promise<void>
}): Promise<boolean> {
  if (!isConfigured() || !requireAuth()) return false

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
    handleSheetError(err, { fallbackMessage: 'خطا در ویرایش تراکنش' })

    return false
  }
}

export async function deleteStoredRecord({
  deletingRecord,
  forms,
  onSuccess
}: {
  deletingRecord: StoredRecord
  forms: CustomForm[]
  onSuccess: () => Promise<void>
}): Promise<boolean> {
  const form = forms.find(item => item.id === deletingRecord.formId)

  if (!form) return false

  if (!isConfigured() || !requireAuth()) return false

  const settings = getSettings()!

  try {
    await deleteRecord(settings.spreadsheetId, form, deletingRecord.rowNumber)
    showSuccess('تراکنش حذف شد')
    await onSuccess()

    return true
  } catch (err) {
    handleSheetError(err, { fallbackMessage: 'خطا در حذف تراکنش' })

    return false
  }
}
