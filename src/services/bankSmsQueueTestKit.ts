import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import type { BankSmsItem } from './bankSmsNative'
import {
  reviewSms,
  type BankSmsReviewItem,
  type LedgerEntry,
  type LinkedRecords,
  type ReviewedSms
} from './bankSmsQueue'

export const M20 = 20_000_000
export const M10 = 10_000_000

const [MELLAT_DEBIT] = BANK_SMS_FIXTURES
/** 2026-10-08 12:00, the day of the SMS. */
const BASE = new Date(2026, 9, 8, 12, 0).getTime()

const template = {
  id: 'tMellat',
  createdAt: '',
  accountId: 'mellat',
  ...guessTemplate(MELLAT_DEBIT.sample)
}
const accounts = [fixtureAccount('mellat')]

/** Debit SMS of `amount` (app currency), received `dayShift` days after BASE. */
export function smsOf(id: string, amount: number, dayShift = 0): ReviewedSms {
  const item: BankSmsItem = {
    id,
    sender: '+98700',
    body: MELLAT_DEBIT.next,
    receivedAt: BASE + dayShift * 86_400_000,
    source: 'live'
  }
  const [entry] = reviewSms([item], [template], accounts, 'toman')

  return { ...entry, amount }
}

export const record = (
  id: string,
  amount: number,
  patch: Partial<LedgerEntry> = {}
): LedgerEntry => ({
  type: 'expense',
  amount,
  date: '2026-10-08',
  accountId: 'mellat',
  id,
  ...patch
})
export const linkedTo = (...pairs: [string, string][]): LinkedRecords =>
  new Map(pairs.map(([id, title]) => [id, { kind: 'dang', noun: 'بدهی', title }]))

export const singles = (items: BankSmsReviewItem[]) =>
  items.map(item => {
    if (item.kind !== 'single') throw new Error('expected single cards')

    return item
  })
