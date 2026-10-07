/** What a number in a bank SMS means. `ignore` covers dates, times and anything else. */
export type SmsSlotRole = 'amount' | 'balance' | 'accountRef' | 'ignore'

/** `debit` = money left the account (expense side); `credit` = money arrived. */
export type SmsDirection = 'debit' | 'credit'

export type SmsAmountUnit = 'rial' | 'toman'

/**
 * A template is the sample SMS with every number replaced by a typed slot,
 * so no amount or card digit from the sample is ever stored.
 */
export type SmsTemplatePart = { kind: 'text'; value: string } | { kind: 'slot'; role: SmsSlotRole }

export interface SmsTemplate {
  id: string
  createdAt: string
  accountId: string
  direction: SmsDirection
  unit: SmsAmountUnit
  parts: SmsTemplatePart[]
}

export type SmsTemplateIssue =
  | 'amount-missing'
  | 'amount-multiple'
  | 'balance-multiple'
  | 'accountRef-multiple'

export interface SmsParsedValues {
  direction: SmsDirection
  unit: SmsAmountUnit
  /** In the SMS's own unit; convert with `toAppCurrency` before storing. */
  amount: number
  balance: number | null
  /** Visible digits of the card/account reference in the SMS ('' when none). */
  ref: string
}

export interface SmsMatchCandidate {
  templateId: string
  accountId: string
}

export type SmsMatchResult =
  | ({ kind: 'matched' } & SmsMatchCandidate & SmsParsedValues)
  | ({ kind: 'ambiguous'; candidates: SmsMatchCandidate[] } & SmsParsedValues)
  | { kind: 'unknown' }
  | { kind: 'irrelevant' }
