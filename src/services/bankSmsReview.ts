import { toAppCurrency } from './bankSmsAmount'
import { matchSms, type LearnedSmsRefs } from './bankSmsMatch'
import type { BankSmsItem } from './bankSmsNative'
import type { ReviewedSms } from './bankSmsQueue'
import type { CurrencyUnit, SmsTemplate, WalletAccount } from '../types'

type MatchAccount = Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>

/** Recognises each SMS and puts its amounts in the app currency, oldest first. */
export function reviewSms(
  items: BankSmsItem[],
  templates: SmsTemplate[],
  accounts: MatchAccount[],
  currency: CurrencyUnit,
  learned: LearnedSmsRefs = {}
): ReviewedSms[] {
  return [...items]
    .sort((a, b) => a.receivedAt - b.receivedAt)
    .map(sms => {
      const result = matchSms(sms.body, templates, accounts, learned)
      const values = result.kind === 'matched' || result.kind === 'ambiguous' ? result : null

      return {
        sms,
        result,
        amount: values ? toAppCurrency(values.amount, values.unit, currency) : null,
        balance:
          values && values.balance !== null
            ? toAppCurrency(values.balance, values.unit, currency)
            : null
      }
    })
    .filter(entry => entry.result.kind !== 'irrelevant')
}
