import { isNativePlatform } from './googleAuthNative'
import { refreshScheduledReminders, requestNotificationPermission } from './localNotifications'
import { refreshOpeningBalancesInBackground } from './openingBalanceRefresh'
import {
  getCurrentPushSubscription,
  getPushSupportStatus,
  subscribeThisDevice
} from './pushNotifications'
import { applyWalletChanges, recordLedgerContext, walletEffectOf } from './recordWallet'
import { fetchReminderRules, saveReminderRules } from './reminders'
import { COUNTERPARTIES_HEADERS } from './sheetHeaders'
import { COUNTERPARTIES_SHEET } from './sheetNames'
import { appendSheetRow, ensureSheetWithHeaders, fetchRecords, updateRecord } from './sheets'
import {
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  WALLET_APPLY_YES
} from '../components/form/fieldUtils'
import type { CustomForm } from '../types'

/**
 * Positive answers to contextual suggestions; each finishes the job on the record just
 * saved. Loaded only when the user taps one.
 */

export async function assignRecordAccount(
  spreadsheetId: string,
  form: CustomForm,
  recordId: string,
  accountId: string
): Promise<void> {
  const record = (await fetchRecords(spreadsheetId, form)).find(item => item.id === recordId)

  if (!record) throw new Error('تراکنش پیدا نشد')

  const values = {
    ...record.values,
    [WALLET_ACCOUNT_FIELD_ID]: accountId,
    [WALLET_APPLY_FIELD_ID]: WALLET_APPLY_YES
  }

  await updateRecord(
    spreadsheetId,
    form,
    record.rowNumber,
    record.id,
    record.createdAt,
    values,
    record.sheetName
  )
  await applyWalletChanges(
    spreadsheetId,
    walletEffectOf(form.type, record.values),
    walletEffectOf(form.type, values),
    recordLedgerContext(values, 'ویرایش', record.id)
  )
  refreshOpeningBalancesInBackground()
}

/** Same row as the counterparties page writes for a name-only contact. */
export async function addCounterpartyByName(spreadsheetId: string, name: string): Promise<void> {
  const [firstName = '', ...rest] = name.trim().split(/\s+/)
  const createdAt = new Date().toLocaleString('fa-IR')

  await ensureSheetWithHeaders(spreadsheetId, COUNTERPARTIES_SHEET, COUNTERPARTIES_HEADERS)
  await appendSheetRow(spreadsheetId, COUNTERPARTIES_SHEET, [
    crypto.randomUUID(),
    createdAt,
    firstName,
    rest.join(' '),
    '',
    '',
    '',
    '[]',
    '[]',
    ''
  ])
}

/** Turns the checks reminder on, then asks for notification permission where it is missing. */
export async function enableCheckReminder(spreadsheetId: string): Promise<void> {
  const rule = (await fetchReminderRules(spreadsheetId)).find(item => item.kind === 'checks')

  if (rule) await saveReminderRules(spreadsheetId, [{ ...rule, enabled: true }])

  if (isNativePlatform()) {
    if (await requestNotificationPermission()) {
      await refreshScheduledReminders(spreadsheetId, { force: true })
    }

    return
  }

  if (getPushSupportStatus() !== 'supported') return
  if (!(await getCurrentPushSubscription().catch(() => null))) {
    await subscribeThisDevice(spreadsheetId)
  }
}
