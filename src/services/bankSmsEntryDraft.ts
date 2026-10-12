import type { ConfirmableSms } from './bankSmsApply'

/** Router state that opens the normal entry form pre-filled from a bank SMS. */
export interface BankSmsEntryDraft {
  formType: 'income' | 'expense'
  bankSms: ConfirmableSms
  prefill: Record<string, string | number>
}

export const BANK_SMS_ENTRY_STATE_KEY = 'bankSmsEntry'

export function readBankSmsEntryDraft(state: unknown): BankSmsEntryDraft | null {
  const draft = (state as Record<string, BankSmsEntryDraft> | null)?.[BANK_SMS_ENTRY_STATE_KEY]

  return draft?.bankSms?.sms?.id ? draft : null
}
