import { settleBuildingEntry } from './buildingExpenseEntry'
import type { LinkRecordInput } from '../../hooks/useLinkTarget'
import { logRecordActivity } from '../../services/activityLog'
import { settleEntryWallet } from '../../services/entryWallet'
import { linkSharedSave, takeSharedChoice } from '../../services/sharedLinkPrefs'
import { appendRecord } from '../../services/sheets'
import { createManualVehicleExpense } from '../../services/vehicleExpenseActions'
import type { CustomForm } from '../../types'
import { parseNumeric } from '../../utils/parseNumeric'
import { showError } from '../../utils/toast'

type VehicleExpenseInput = Parameters<typeof createManualVehicleExpense>[1]

/**
 * Writes a new entry (a vehicle expense goes through its own service, which
 * returns the record id) and adds its «فعالیت_ها» line. Throws on failure.
 */
export async function writeEntryRecord(
  spreadsheetId: string,
  form: CustomForm,
  marked: Record<string, string | number>,
  vehicleInput: VehicleExpenseInput | null
): Promise<string> {
  // The shared tick's answer is never written; the copy follows the personal write.
  const { values, choice } = takeSharedChoice(marked)
  let recordId: string = crypto.randomUUID()

  if (vehicleInput) {
    recordId = await createManualVehicleExpense(spreadsheetId, vehicleInput)
  } else {
    await appendRecord(spreadsheetId, form, recordId, new Date().toLocaleString('fa-IR'), values)
    if (choice) linkSharedSave(spreadsheetId, recordId, form.type, values, choice)
  }
  logRecordActivity(spreadsheetId, 'create', recordId, values)

  return recordId
}

/**
 * After the record is written: applies it to the wallet and, for a building expense, to the
 * units' shares, then (when a «بدهی»/«طلب» was picked) as the payment of that debt or receivable.
 * A failure here is reported but must not invite a second save of the record.
 */
export async function settleSavedEntry(
  spreadsheetId: string,
  form: CustomForm,
  values: Record<string, string | number>,
  bankSms: Parameters<typeof settleEntryWallet>[3],
  recordId: string,
  linkRecord?: (record: LinkRecordInput) => Promise<boolean>
): Promise<void> {
  await settleEntryWallet(spreadsheetId, form.type, values, bankSms, recordId).catch(() =>
    showError('رکورد ذخیره شد ولی موجودی حساب به‌روز نشد')
  )
  await settleBuildingEntry(spreadsheetId, form, recordId, values).catch(() =>
    showError('هزینه ذخیره شد ولی سهم واحدها یا بدهی ثبت نشد؛ آن را دوباره ذخیره کن')
  )
  const dateFieldId = form.fields.find(field => field.type === 'date')?.id

  // The record exists: the payment step has its own error handling and never asks for a new save.
  await linkRecord?.({
    recordId,
    amount: Math.abs(parseNumeric(String(values.amount ?? ''))),
    date: String(dateFieldId ? values[dateFieldId] ?? '' : '')
  })
}
