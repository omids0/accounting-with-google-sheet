import { toAppCurrency, usableSmsAmount, usableSmsBalance } from './bankSmsAmount'
import { matchSms, type LearnedSmsRefs } from './bankSmsMatch'
import type { BankSmsItem } from './bankSmsNative'
import type { ReviewedSms } from './bankSmsQueue'
import type { CurrencyUnit, SmsTemplate, WalletAccount } from '../types'

type MatchAccount = Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>

/**
 * Recognises each SMS and puts its amounts in the app currency, oldest first. An SMS whose amount is
 * zero, negative, not a number or above the cap (`MAX_SMS_AMOUNT_TOMAN`) is spoofed or garbled: it
 * becomes an «unknown text» card (manual entry or dismiss) and is never confirmable. A «مانده» that is
 * not a number or above the cap is dropped so it cannot overwrite a wallet.
 */
export function reviewSms(
  items: BankSmsItem[],
  templates: SmsTemplate[],
  accounts: MatchAccount[],
  currency: CurrencyUnit,
  learned: LearnedSmsRefs = {}
): ReviewedSms[] {
  return [...items]
    .sort((a, b) => a.receivedAt - b.receivedAt)
    .map((sms): ReviewedSms => {
      const result = matchSms(sms.body, templates, accounts, learned)
      const values = result.kind === 'matched' || result.kind === 'ambiguous' ? result : null

      if (!values) return { sms, result, amount: null, balance: null }

      const converted = toAppCurrency(values.amount, values.unit, currency)

      // `null` here is a usd/eur book (not confirmable, as before); a number that fails is unusable.
      if (converted !== null && usableSmsAmount(converted, currency) === null) {
        return { sms, result: { kind: 'unknown' }, amount: null, balance: null }
      }

      const balance =
        values.balance === null ? null : toAppCurrency(values.balance, values.unit, currency)

      return { sms, result, amount: converted, balance: usableSmsBalance(balance, currency) }
    })
    .filter(entry => entry.result.kind !== 'irrelevant')
}
