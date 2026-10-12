import { toAppCurrency } from './bankSmsAmount'
import { SMS_RECORD_NOTE } from './bankSmsApply'
import { smsRecordDate } from './bankSmsDate'
import { matchSms, type LearnedSmsRefs } from './bankSmsMatch'
import type { ReviewedSms } from './bankSmsQueue'
import type { EntryDraft } from './entryDraft'
import {
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  WALLET_APPLY_YES
} from '../components/form/fieldUtils'
import type { CurrencyUnit, SmsTemplate, WalletAccount } from '../types'

/** Text shared into the app (web share target): open the form, or teach its template first. */
export type SharedSmsRoute = ({ kind: 'entry' } & EntryDraft) | { kind: 'unknown' }

type RefAccount = Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>

/**
 * Same parser as the bank SMS queue. A recognised SMS fills amount, account and
 * direction (the account stays empty when the digits fit several); anything else
 * goes to the «پیامک ناشناخته» card so the user can tap the amount.
 */
export function routeSharedText(
  text: string,
  templates: SmsTemplate[],
  accounts: RefAccount[],
  currency: CurrencyUnit,
  learned: LearnedSmsRefs = {},
  now = Date.now()
): SharedSmsRoute {
  const result = matchSms(text, templates, accounts, learned)

  if (result.kind !== 'matched' && result.kind !== 'ambiguous') return { kind: 'unknown' }

  const amount = toAppCurrency(result.amount, result.unit, currency)

  if (!amount) return { kind: 'unknown' }

  return {
    kind: 'entry',
    formType: result.direction === 'debit' ? 'expense' : 'income',
    prefill: {
      date: smsRecordDate(text, now),
      amount,
      [WALLET_ACCOUNT_FIELD_ID]: result.kind === 'matched' ? result.accountId : '',
      [WALLET_APPLY_FIELD_ID]: WALLET_APPLY_YES,
      note: SMS_RECORD_NOTE
    }
  }
}

/** The shared text as a queue entry, for the «پیامک ناشناخته» card. */
export function sharedSmsEntry(text: string, receivedAt: number): ReviewedSms {
  return {
    sms: { id: `shared-${receivedAt}`, sender: '', body: text, receivedAt, source: 'inbox' },
    result: { kind: 'unknown' },
    amount: null,
    balance: null
  }
}
