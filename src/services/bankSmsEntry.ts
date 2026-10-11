import { SMS_RECORD_NOTE, smsAlreadyInBalance, type ConfirmableSms } from './bankSmsApply'
import { smsRecordDate } from './bankSmsDate'
import {
  SUBCATEGORY_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  WALLET_APPLY_NO,
  WALLET_APPLY_YES
} from '../components/form/fieldUtils'

/** Router state that opens the normal entry form pre-filled from a bank SMS. */
export interface BankSmsEntryDraft {
  formType: 'income' | 'expense'
  bankSms: ConfirmableSms
  prefill: Record<string, string | number>
}

const STATE_KEY = 'bankSmsEntry'

/**
 * The SMS fills only what it knows (date, amount, account). Title and category stay
 * empty and required, so the user names every record instead of saving a guess.
 */
export function buildBankSmsEntryState(
  entry: ConfirmableSms
): Record<typeof STATE_KEY, BankSmsEntryDraft> {
  return {
    [STATE_KEY]: {
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

export function readBankSmsEntryDraft(state: unknown): BankSmsEntryDraft | null {
  const draft = (state as Record<string, BankSmsEntryDraft> | null)?.[STATE_KEY]

  return draft?.bankSms?.sms?.id ? draft : null
}
