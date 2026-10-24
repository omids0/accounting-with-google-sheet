import { logRecordActivity } from './activityLog'
import { SMS_RECORD_NOTE, type ConfirmableSms } from './bankSmsApply'
import { smsRecordDate } from './bankSmsDate'
import { markBankSmsHandled } from './bankSmsNative'
import { prepareEntryValues, settleEntryWallet } from './entryWallet'
import { createManualVehicleExpense } from './vehicleExpenseActions'
import {
  SUBCATEGORY_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID
} from '../components/form/fieldUtils'
import { VEHICLE_EXPENSE_CATEGORY } from '../components/vehicles/constants'
import type { VehicleExpenseFormValues } from '../utils/vehicleExpenseUtils'

export type SmsVehicleInput = VehicleExpenseFormValues & {
  /** The periodic service this expense renews (see useVehicleExpenseEntry). */
  renewServiceId?: string
}

/**
 * Saves an SMS straight from its card as a vehicle expense: the same writes as the entry form's
 * save for a record opened from an SMS (vehicle expense + metadata + mileage, activity line,
 * balance and queue). Throws before the record exists; once it exists the SMS leaves the queue
 * first, so a later failure can never lead to the same expense being written twice.
 */
export async function confirmSmsVehicleExpense(
  spreadsheetId: string,
  entry: ConfirmableSms,
  vehicle: SmsVehicleInput
): Promise<string> {
  const accountId = entry.result.accountId
  const values = prepareEntryValues(
    'expense',
    {
      title: vehicle.expenseType,
      date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
      amount: entry.amount,
      category: VEHICLE_EXPENSE_CATEGORY,
      [SUBCATEGORY_FIELD_ID]: vehicle.expenseType,
      note: SMS_RECORD_NOTE,
      [WALLET_ACCOUNT_FIELD_ID]: accountId
    },
    entry
  )
  const recordId = await createManualVehicleExpense(spreadsheetId, {
    ...vehicle,
    date: String(values.date),
    amount: entry.amount,
    note: SMS_RECORD_NOTE,
    walletAccount: accountId,
    walletApply: String(values[WALLET_APPLY_FIELD_ID] ?? '')
  })

  await markBankSmsHandled([entry.sms.id])
  logRecordActivity(spreadsheetId, 'create', recordId, values)
  // The expense exists and the SMS left the queue: say so instead of a generic failure, so the
  // user does not enter it again by hand.
  await settleEntryWallet(spreadsheetId, 'expense', values, entry, recordId).catch(() => {
    throw new Error('رکورد ذخیره شد ولی موجودی حساب به‌روز نشد')
  })

  return recordId
}
