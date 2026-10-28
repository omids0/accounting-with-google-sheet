import type { StoredRecord } from './recordsUtils'
import { logRecordActivity } from '../../services/activityLog'
import { readBridgePrefs } from '../../services/bridgePrefs'
import { isBuildingExpenseValues } from '../../services/buildingExpenseSplit'
import { refreshOpeningBalancesInBackground } from '../../services/openingBalanceRefresh'
import { syncLinkedOnRecordDeleted, syncLinkedOnRecordUpdated } from '../../services/recordLinks'
import {
  applyWalletChanges,
  prepareWalletChanges,
  recordLedgerContext,
  walletEffectOf
} from '../../services/recordWallet'
import { getSettings, isConfigured } from '../../services/settings'
import { linkSharedDelete, linkSharedSave, takeSharedChoice } from '../../services/sharedLinkPrefs'
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
  settleBuildingEntry,
  syncBridgedEdit
} from '../dataEntry/buildingExpenseEntry'
import { isLinked, SHARED_LINK_FIELD_ID } from '../form/sharedFields'

export async function submitRecordEdit({
  editingRecord,
  editingForm,
  formValues: marked,
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

  // The shared tick's answer is never written; the copy follows once the record is saved.
  const { values: entered, choice } = takeSharedChoice(marked)
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

    // An old record saved without this field is not blocked for it.
    if (!(editingRecord.values[field.id] ?? '').trim()) continue

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
        walletApply: String(formValues.walletApply ?? ''),
        // The tick decides the link here too; without a tick the row keeps its own.
        ...(choice ? { sharedLink: String(formValues[SHARED_LINK_FIELD_ID] ?? '') } : {})
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
    await syncBridgedEdit(editingForm, editingRecord.id, formValues)
    logRecordActivity(settings.spreadsheetId, 'update', editingRecord.id, formValues)
    if (choice) {
      const was = editingRecord.values[SHARED_LINK_FIELD_ID] ?? ''

      linkSharedSave(
        settings.spreadsheetId,
        editingRecord.id,
        editingForm.type,
        formValues,
        choice,
        was
      )
    }
    showSuccess('تراکنش ویرایش شد')
    // A debt or receivable payment linked to this record follows its new amount and date.
    await syncLinkedOnRecordUpdated(
      settings.spreadsheetId,
      editingRecord.id,
      editingForm.type,
      editingRecord.values,
      formValues
    )
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
 *
 * Safe to run again for the same record after an interruption (reload, killed app): each step
 * checks whether it is already done, so a retry finishes the missing parts only. The order makes
 * every interrupted state recoverable:
 *  1. every network read first, nothing written yet (a kill here changes nothing);
 *  2. the refund (balance + «حذف» history line), skipped on a retry once its line exists;
 *  3. the row delete, skipped when the row is gone. A deleted row therefore always has its refund,
 *     and while the row is still listed the user (or a retry) can delete it again;
 *  4. the payments linked to the record (instalment, check, debt…). These re-read the sheet, so
 *     they are the only long step. If it is cut short, `healOrphanedRecordLinks` finishes it at
 *     the next start.
 */
export async function deleteStoredRecord({
  spreadsheetId,
  record,
  form,
  sharedAnswer = 'one',
  leaving = false
}: {
  spreadsheetId: string
  record: StoredRecord
  form: CustomForm
  /** A linked record: its shared copy goes too, or stays unlinked (`SharedDeleteChoiceSheet`). */
  sharedAnswer?: 'both' | 'one'
  /** The app is being closed or hidden: no balance re-read, so the writes start at once. */
  leaving?: boolean
}): Promise<void> {
  const category = String(record.values.category ?? '')

  const refund = await prepareWalletChanges(
    spreadsheetId,
    walletEffectOf(form.type, record.values),
    null,
    recordLedgerContext(record.values, 'حذف', record.id),
    { refresh: !leaving }
  )

  if (form.type === 'expense' && isVehicleExpenseCategory(category)) {
    await handleExpenseRecordDeleted(spreadsheetId, record.id, category)
  }

  await refund()

  const removed = await deleteRecord(
    spreadsheetId,
    form,
    record.rowNumber,
    record.sheetName,
    record.id
  )

  if (removed) {
    logRecordActivity(spreadsheetId, 'delete', record.id, record.values)
    if (isLinked(record.values)) linkSharedDelete(spreadsheetId, form.type, record, sharedAnswer)
  }
  // The delete is committed: payments of a debt or receivable that pointed at the record go with it.
  await syncLinkedOnRecordDeleted(spreadsheetId, record.id, form.type)
  if (form.type === 'expense' && isBuildingExpenseValues(record.values)) {
    const { removeBuildingExpenseShares } = await import('../../services/buildingExpenseActions')

    await removeBuildingExpenseShares(spreadsheetId, record.id, record.values).catch(() =>
      showError('هزینه حذف شد ولی سهم‌های پرداخت‌نشده حذف نشدند')
    )
    // Bridge A: the manager's personal receivable for this expense goes (or is marked) with it.
    if (readBridgePrefs().sent[record.id]) {
      const { syncBridgedExpenseDelete } = await import('../../services/bridgeSync')

      await syncBridgedExpenseDelete(record.id).catch(() => undefined)
    }
  }
  refreshOpeningBalancesInBackground()
}
