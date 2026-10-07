import { describe, expect, it } from 'vitest'

import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import type { BankSmsItem } from './bankSmsNative'
import {
  buildReviewItems,
  nextAccountBalance,
  reviewSms,
  TRANSFER_WINDOW_MS,
  type LedgerEntry
} from './bankSmsQueue'
import type { SmsTemplate } from '../types'

const [MELLAT_DEBIT, , , , , TEJARAT_CREDIT] = BANK_SMS_FIXTURES
const BASE = new Date(2026, 9, 7, 12, 0).getTime()

function sms(id: string, body: string, receivedAt = BASE): BankSmsItem {
  return { id, sender: '+98700', body, receivedAt, source: 'live' }
}

function template(sample: string, id: string, accountId: string): SmsTemplate {
  return { id, createdAt: '', accountId, ...guessTemplate(sample) }
}

const templates = [
  template(MELLAT_DEBIT.sample, 'tMellat', 'mellat'),
  template(TEJARAT_CREDIT.sample, 'tTejarat', 'tejarat')
]
const accounts = [fixtureAccount('mellat'), fixtureAccount('tejarat')]

/** Mellat debit and Tejarat credit of the same 1,000,000 rial. */
const debit = MELLAT_DEBIT.next.replace('90,000', '1,000,000')

describe('reviewSms', () => {
  it('converts amounts to the app currency and drops non-bank SMS', () => {
    const reviewed = reviewSms(
      [sms('a', MELLAT_DEBIT.next), sms('b', 'سلام 1234 خوبی؟')],
      templates,
      accounts,
      'toman'
    )

    expect(reviewed).toHaveLength(1)
    expect(reviewed[0]).toMatchObject({ amount: 9000, balance: 834000 })
  })
})

describe('buildReviewItems', () => {
  it('pairs a debit and a credit of the same amount in two own accounts', () => {
    const reviewed = reviewSms(
      [sms('d', debit), sms('c', TEJARAT_CREDIT.next, BASE + 60_000)],
      templates,
      accounts,
      'rial'
    )

    expect(buildReviewItems(reviewed, [])).toMatchObject([
      { kind: 'transfer', debit: { sms: { id: 'd' } }, credit: { sms: { id: 'c' } } }
    ])
  })

  it('does not pair SMS further apart than the transfer window', () => {
    const reviewed = reviewSms(
      [sms('d', debit), sms('c', TEJARAT_CREDIT.next, BASE + TRANSFER_WINDOW_MS + 1)],
      templates,
      accounts,
      'rial'
    )

    expect(buildReviewItems(reviewed, []).map(item => item.kind)).toEqual(['single', 'single'])
  })

  it('flags a probable duplicate of a record already entered by hand', () => {
    const reviewed = reviewSms([sms('a', MELLAT_DEBIT.next)], templates, accounts, 'toman')
    const ledger: LedgerEntry[] = [
      { type: 'expense', amount: 9000, date: '2026-10-08', accountId: '' }
    ]

    expect(buildReviewItems(reviewed, ledger)).toMatchObject([
      { probableDuplicate: true, duplicateMovedBalance: false }
    ])
    expect(buildReviewItems(reviewed, [{ ...ledger[0], accountId: 'mellat' }])).toMatchObject([
      { probableDuplicate: true, duplicateMovedBalance: true }
    ])
    expect(buildReviewItems(reviewed, [{ ...ledger[0], type: 'income' }])).toMatchObject([
      { probableDuplicate: false }
    ])
  })
})

describe('nextAccountBalance', () => {
  const change = { receivedAt: 1000, direction: 'debit' as const, amount: 50 }

  it('takes the SMS balance and moves the anchor', () => {
    expect(nextAccountBalance(999, change, 700, {})).toEqual({
      balance: 700,
      state: { anchor: 1000, lastAppliedAt: 1000 }
    })
  })

  it('adds or subtracts the amount when the SMS has no balance', () => {
    expect(nextAccountBalance(500, change, null, { anchor: 900 })).toEqual({
      balance: 450,
      state: { anchor: 900, lastAppliedAt: 1000 }
    })
    expect(nextAccountBalance(500, { ...change, direction: 'credit' }, null, {})).toEqual({
      balance: 550,
      state: { anchor: undefined, lastAppliedAt: 1000 }
    })
  })

  it('leaves the balance alone for an SMS older than the anchor', () => {
    expect(nextAccountBalance(500, change, 700, { anchor: 2000 })).toBeNull()
    expect(nextAccountBalance(500, change, null, { anchor: 2000 })).toBeNull()
  })

  it('does not let an older «مانده» undo a newer SMS confirmed first', () => {
    // 1000 → B (t=2000, −50, no «مانده») → 950. Then A (t=1000, −100, «مانده» 900).
    const afterB = nextAccountBalance(1000, { ...change, receivedAt: 2000 }, null, {})

    expect(afterB).toEqual({ balance: 950, state: { anchor: undefined, lastAppliedAt: 2000 } })
    expect(nextAccountBalance(950, { ...change, amount: 100 }, 900, afterB!.state)).toEqual({
      balance: 850,
      state: { anchor: undefined, lastAppliedAt: 2000 }
    })
  })
})

describe('buildReviewItems — split transfers', () => {
  it('keeps SMS the user split as separate items', () => {
    const reviewed = reviewSms(
      [sms('d', debit), sms('c', TEJARAT_CREDIT.next, BASE + 60_000)],
      templates,
      accounts,
      'rial'
    )

    expect(buildReviewItems(reviewed, [], new Set(['d'])).map(item => item.kind)).toEqual([
      'single',
      'single'
    ])
  })
})
