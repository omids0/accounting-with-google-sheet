import { settleSmsFromEntry, smsAlreadyInBalance, type ConfirmableSms } from './bankSmsApply'
import {
  applyWalletChanges,
  logUnappliedRecord,
  recordLedgerContext,
  walletEffectOf
} from './recordWallet'
import {
  SUBCATEGORY_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  WALLET_APPLY_NO
} from '../components/form/fieldUtils'
import type { FormType } from '../types'

/**
 * Wallet side of saving a new income/expense record from the entry form:
 * a plain record moves its account's balance; a record opened from a bank SMS
 * also leaves the SMS queue and follows the SMS «مانده».
 */
export async function settleEntryWallet(
  spreadsheetId: string,
  type: FormType,
  values: Record<string, string | number>,
  bankSms: ConfirmableSms | undefined,
  recordId: string
): Promise<void> {
  const effect = walletEffectOf(type, values)
  const context = recordLedgerContext(values, 'ثبت', recordId)

  await logUnappliedRecord(spreadsheetId, type, values, context)

  if (!bankSms) {
    await applyWalletChanges(spreadsheetId, null, effect, context)

    return
  }

  await settleSmsFromEntry(
    spreadsheetId,
    bankSms,
    effect,
    {
      category: String(values.category ?? ''),
      subCategory: String(values[SUBCATEGORY_FIELD_ID] ?? '')
    },
    context
  )
}

/**
 * Values to store for a record opened from a bank SMS: keep the account but turn the balance
 * update off when a newer «مانده» already includes this SMS, so the record never undoes an
 * amount it never applied.
 */
export function prepareEntryValues(
  type: FormType,
  values: Record<string, string | number>,
  bankSms?: ConfirmableSms
): Record<string, string | number> {
  const effect = walletEffectOf(type, values)

  if (!bankSms || !effect || !smsAlreadyInBalance(bankSms, effect.accountId)) return values

  return { ...values, [WALLET_APPLY_FIELD_ID]: WALLET_APPLY_NO }
}
