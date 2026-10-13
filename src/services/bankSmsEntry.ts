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

export interface BankSmsEntryOptions {
  /** ⋯ «ثبت درآمد/هزینه»: the opposite of the SMS direction. */
  formType?: BankSmsEntryDraft['formType']
  /** The card's category (suggested or picked); empty when it has none. */
  choice?: { category: string; subCategory: string; title?: string } | null
}

/**
 * The SMS fills what it knows (date, amount, account) plus the card's category when
 * it has one; otherwise title and category stay empty and required.
 */
export function buildBankSmsEntryState(
  entry: ConfirmableSms,
  { formType, choice }: BankSmsEntryOptions = {}
): Record<typeof BANK_SMS_ENTRY_STATE_KEY, BankSmsEntryDraft> {
  return {
    [BANK_SMS_ENTRY_STATE_KEY]: {
      formType: formType ?? (entry.result.direction === 'debit' ? 'expense' : 'income'),
      bankSms: entry,
      prefill: {
        date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
        amount: entry.amount,
        title: choice?.title ?? '',
        category: choice?.category ?? '',
        [SUBCATEGORY_FIELD_ID]: choice?.subCategory ?? '',
        [WALLET_ACCOUNT_FIELD_ID]: entry.result.accountId,
        [WALLET_APPLY_FIELD_ID]: smsAlreadyInBalance(entry, entry.result.accountId)
          ? WALLET_APPLY_NO
          : WALLET_APPLY_YES,
        note: SMS_RECORD_NOTE
      }
    }
  }
}
