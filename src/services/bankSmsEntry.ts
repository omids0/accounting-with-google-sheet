import { SMS_RECORD_NOTE, type ConfirmableSms } from './bankSmsApply'
import { smsRecordDate } from './bankSmsDate'
import { getBankSmsPrefs } from './bankSmsPrefs'
import { SUBCATEGORY_FIELD_ID, WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'

/** Router state that opens the normal entry form pre-filled from a bank SMS. */
export interface BankSmsEntryDraft {
  formType: 'income' | 'expense'
  bankSms: ConfirmableSms
  prefill: Record<string, string | number>
}

const STATE_KEY = 'bankSmsEntry'

export function buildBankSmsEntryState(
  entry: ConfirmableSms,
  accountTitle: string
): Record<typeof STATE_KEY, BankSmsEntryDraft> {
  const remembered = getBankSmsPrefs().lastCategory[entry.result.templateId]

  return {
    [STATE_KEY]: {
      formType: entry.result.direction === 'debit' ? 'expense' : 'income',
      bankSms: entry,
      prefill: {
        date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
        amount: entry.amount,
        title: `پیامک ${accountTitle}`,
        category: remembered?.category ?? '',
        [SUBCATEGORY_FIELD_ID]: remembered?.subCategory ?? '',
        [WALLET_ACCOUNT_FIELD_ID]: entry.result.accountId,
        note: SMS_RECORD_NOTE
      }
    }
  }
}

export function readBankSmsEntryDraft(state: unknown): BankSmsEntryDraft | null {
  const draft = (state as Record<string, BankSmsEntryDraft> | null)?.[STATE_KEY]

  return draft?.bankSms?.sms?.id ? draft : null
}
