import type { StoredRecord } from './recordsUtils'
import { refreshOpeningBalancesInBackground } from '../../services/openingBalanceRefresh'
import { getSettings, isConfigured } from '../../services/settings'
import { deleteRecord, updateRecord } from '../../services/sheets'
import {
  handleExpenseRecordDeleted,
  handleExpenseRecordUpdated
} from '../../services/vehicleExpenseActions'
import type { CustomForm } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import {
  isVehicleExpenseCategory,
  type VehicleExpenseFormValues
} from '../../utils/vehicleExpenseUtils'

export async function submitRecordEdit({
  editingRecord,
  editingForm,
  formValues,
  vehicleExpense,
  onSuccess
}: {
  editingRecord: StoredRecord
  editingForm: CustomForm
  formValues: Record<string, string | number>
  vehicleExpense?: VehicleExpenseFormValues & { note?: string }
  onSuccess: () => Promise<void>
}): Promise<boolean> {
  if (!isConfigured() || !requireAuth()) return false

  for (const field of editingForm.fields) {
    if (!field.required) continue

    const category = String(formValues.category ?? '')
    if (isVehicleExpenseCategory(category) && field.id === 'title') continue

    const val = formValues[field.id]

    if (val === '' || val === undefined || val === null) {
      showError(`فیلد «${field.label}» الزامی است`)

      return false
    }
  }

  const settings = getSettings()!
  const category = String(formValues.category ?? '')
  const isVehicleExpense = editingForm.type === 'expense' && isVehicleExpenseCategory(category)

  try {
    if (isVehicleExpense) {
      if (!vehicleExpense) {
        showError('اطلاعات هزینه خودرو کامل نیست')

        return false
      }

      await handleExpenseRecordUpdated(settings.spreadsheetId, editingRecord.id, category, {
        ...vehicleExpense,
        date: String(formValues.date ?? ''),
        amount: Number(formValues.amount) || 0,
        note: String(formValues.note ?? '')
      })
    } else {
      await updateRecord(
        settings.spreadsheetId,
        editingForm,
        editingRecord.rowNumber,
        editingRecord.id,
        editingRecord.createdAt,
        formValues
      )

      if (editingForm.type === 'expense') {
        await handleExpenseRecordUpdated(settings.spreadsheetId, editingRecord.id, category, {
          vehicleId: '',
          expenseType: '',
          fuelPricePerLiter: '',
          mileage: '',
          date: String(formValues.date ?? ''),
          amount: Number(formValues.amount) || 0,
          note: String(formValues.note ?? '')
        })
      }
    }

    showSuccess('تراکنش ویرایش شد')
    refreshOpeningBalancesInBackground()
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
  const category = String(deletingRecord.values.category ?? '')

  try {
    if (form.type === 'expense' && isVehicleExpenseCategory(category)) {
      await handleExpenseRecordDeleted(settings.spreadsheetId, deletingRecord.id, category)
    }

    await deleteRecord(settings.spreadsheetId, form, deletingRecord.rowNumber)
    showSuccess('تراکنش حذف شد')
    refreshOpeningBalancesInBackground()
    await onSuccess()

    return true
  } catch (err) {
    handleSheetError(err, { fallbackMessage: 'خطا در حذف تراکنش' })

    return false
  }
}
