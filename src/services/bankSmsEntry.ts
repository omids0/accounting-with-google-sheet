import { SMS_RECORD_NOTE, smsAlreadyInBalance, type ConfirmableSms } from './bankSmsApply'
import { smsRecordDate } from './bankSmsDate'
import { BANK_SMS_ENTRY_STATE_KEY, type BankSmsEntryDraft } from './bankSmsEntryDraft'
import {
  SUBCATEGORY_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  WALLET_APPLY_NO,
  WALLET_APPLY_YES
} from '../components/form/fieldUtils'

export { readBankSmsEntryDraft, type BankSmsEntryDraft } from './bankSmsEntryDraft'

/**
 * The SMS fills only what it knows (date, amount, account). Title and category stay
 * empty and required, so the user names every record instead of saving a guess.
 */
export function buildBankSmsEntryState(
  entry: ConfirmableSms
): Record<typeof BANK_SMS_ENTRY_STATE_KEY, BankSmsEntryDraft> {
  return {
    [BANK_SMS_ENTRY_STATE_KEY]: {
      formType: entry.result.direction === 'debit' ? 'expense' : 'income',
      bankSms: entry,
      prefill: {
        date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
        amount: entry.amount,
        title: '',
        category: '',
        [SUBCATEGORY_FIELD_ID]: '',
        [WALLET_ACCOUNT_FIELD_ID]: entry.result.accountId,
        [WALLET_APPLY_FIELD_ID]: smsAlreadyInBalance(entry, entry.result.accountId)
          ? WALLET_APPLY_NO
          : WALLET_APPLY_YES,
        note: SMS_RECORD_NOTE
      }
    }
  }
}
