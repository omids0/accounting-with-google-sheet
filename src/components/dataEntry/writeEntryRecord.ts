import { settleBuildingEntry } from './buildingExpenseEntry'
import type { LinkRecordInput } from '../../hooks/useLinkTarget'
import { logRecordActivity } from '../../services/activityLog'
import type { ConfirmableSms } from '../../services/bankSmsApply'
import { QueueNotLeftError } from '../../services/bankSmsQueueError'
import { liveRecordOfSms } from '../../services/bankSmsRecordOf'
import { settleEntryWallet } from '../../services/entryWallet'
import { linkSharedSave, takeSharedChoice } from '../../services/sharedLinkPrefs'
import { appendRecord } from '../../services/sheets'
import { createManualVehicleExpense } from '../../services/vehicleExpenseActions'
import type { CustomForm } from '../../types'
import { parseNumeric } from '../../utils/parseNumeric'
import { showError } from '../../utils/toast'

/** The SMS was saved before and only failed to leave the queue: its record is there, a second one is not written. */
async function assertSmsWithoutRecord(spreadsheetId: string, sms: ConfirmableSms) {
  const type = sms.result.direction === 'debit' ? 'expense' : 'income'

  if (await liveRecordOfSms(spreadsheetId, sms.sms.id, type)) {
    throw new Error(
      'این پیامک قبلاً یک رکورد ساخته است و فقط از صف بیرون نرفته. رکورد را در «رکوردها» ببین و پیامک را با «⋯ ← قبلاً ثبت شده» ببند؛ دوباره ثبتش نکن.'
    )
  }
}

type VehicleExpenseInput = Parameters<typeof createManualVehicleExpense>[1]

/**
 * Writes a new entry (a vehicle expense goes through its own service, which
 * returns the record id) and adds its «فعالیت_ها» line. Throws on failure.
 */
export async function writeEntryRecord(
  spreadsheetId: string,
  form: CustomForm,
  marked: Record<string, string | number>,
  vehicleInput: VehicleExpenseInput | null,
  /** The SMS the form was opened from: one that already has its live record never writes a second. */
  bankSms?: ConfirmableSms
): Promise<string> {
  if (bankSms) await assertSmsWithoutRecord(spreadsheetId, bankSms)

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
  // The wallet step failing is told by reason: a queue mark that failed after the balance moved is
  // not «the balance was not updated».
  await settleEntryWallet(spreadsheetId, form.type, values, bankSms, recordId).catch(err =>
    showError(
      err instanceof QueueNotLeftError ? err.message : 'رکورد ذخیره شد ولی موجودی حساب به‌روز نشد'
    )
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
