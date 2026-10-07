import { settleSmsFromEntry, type ConfirmableSms } from './bankSmsApply'
import { applyWalletChanges, walletEffectOf } from './recordWallet'
import { SUBCATEGORY_FIELD_ID } from '../components/form/fieldUtils'
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
  bankSms?: ConfirmableSms
): Promise<void> {
  const effect = walletEffectOf(type, values)

  if (!bankSms) {
    await applyWalletChanges(spreadsheetId, null, effect)

    return
  }

  await settleSmsFromEntry(spreadsheetId, bankSms, effect, {
    category: String(values.category ?? ''),
    subCategory: String(values[SUBCATEGORY_FIELD_ID] ?? '')
  })
}
