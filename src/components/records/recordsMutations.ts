import type { StoredRecord } from './recordsUtils'
import { logRecordActivity } from '../../services/activityLog'
import { isBuildingExpenseValues } from '../../services/buildingExpenseSplit'
import { refreshOpeningBalancesInBackground } from '../../services/openingBalanceRefresh'
import {
  applyWalletChanges,
  recordLedgerContext,
  walletEffectOf
} from '../../services/recordWallet'
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
import {
  buildingEntryError,
  prepareBuildingEntry,
  settleBuildingEntry
} from '../dataEntry/buildingExpenseEntry'

export async function submitRecordEdit({
  editingRecord,
  editingForm,
  formValues: entered,
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

  const buildingError = buildingEntryError(editingForm, entered)

  if (buildingError) {
    showError(buildingError)

    return false
  }

  // A building expense paid by someone other than the fund keeps no account.
  const formValues = prepareBuildingEntry(editingForm, entered)

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
        note: String(formValues.note ?? ''),
        walletAccount: String(formValues.walletAccount ?? ''),
        walletApply: String(formValues.walletApply ?? '')
      })
    } else {
      await updateRecord(
        settings.spreadsheetId,
        editingForm,
        editingRecord.rowNumber,
        editingRecord.id,
        editingRecord.createdAt,
        formValues,
        editingRecord.sheetName
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

    await applyWalletChanges(
      settings.spreadsheetId,
      walletEffectOf(editingForm.type, editingRecord.values),
      walletEffectOf(editingForm.type, formValues),
      recordLedgerContext(formValues, 'ویرایش', editingRecord.id)
    )
    await settleBuildingEntry(
      settings.spreadsheetId,
      editingForm,
      editingRecord.id,
      formValues
    ).catch(() => showError('تغییر ذخیره شد ولی سهم واحدها یا بدهی به‌روز نشد'))
    logRecordActivity(settings.spreadsheetId, 'update', editingRecord.id, formValues)
    showSuccess('تراکنش ویرایش شد')
    refreshOpeningBalancesInBackground()
    await onSuccess()

    return true
  } catch (err) {
    handleSheetError(err, { fallbackMessage: 'خطا در ویرایش تراکنش' })

    return false
  }
}

/**
 * The sheet write behind an undoable delete. `record` must carry its current
 * row and tab. Throws on failure so the undo hook can report it and restore.
 */
export async function deleteStoredRecord({
  spreadsheetId,
  record,
  form
}: {
  spreadsheetId: string
  record: StoredRecord
  form: CustomForm
}): Promise<void> {
  const category = String(record.values.category ?? '')

  if (form.type === 'expense' && isVehicleExpenseCategory(category)) {
    await handleExpenseRecordDeleted(spreadsheetId, record.id, category)
  }

  await deleteRecord(spreadsheetId, form, record.rowNumber, record.sheetName)
  logRecordActivity(spreadsheetId, 'delete', record.id, record.values)
  await applyWalletChanges(
    spreadsheetId,
    walletEffectOf(form.type, record.values),
    null,
    recordLedgerContext(record.values, 'حذف', record.id)
  )
  if (form.type === 'expense' && isBuildingExpenseValues(record.values)) {
    const { removeBuildingExpenseShares } = await import('../../services/buildingExpenseActions')

    await removeBuildingExpenseShares(spreadsheetId, record.id, record.values).catch(() =>
      showError('هزینه حذف شد ولی سهم‌های پرداخت‌نشده حذف نشدند')
    )
  }
  refreshOpeningBalancesInBackground()
}
