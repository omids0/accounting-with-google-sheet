import { describe, expect, it } from 'vitest'

import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import type { BankSmsItem } from './bankSmsNative'
import { buildReviewItems, reviewSms, type LedgerEntry } from './bankSmsQueue'
import { smsTransferId } from './bankSmsTransferRows'
import type { Transfer } from './transfersModel'
import type { SmsTemplate } from '../types'

const [MELLAT_DEBIT, , , , , TEJARAT_CREDIT] = BANK_SMS_FIXTURES
const BASE = new Date(2026, 9, 7, 12, 0).getTime()

const sms = (id: string, body: string, receivedAt = BASE): BankSmsItem => ({
  id,
  sender: '+98700',
  body,
  receivedAt,
  source: 'live'
})
const template = (sample: string, id: string, accountId: string): SmsTemplate => ({
  id,
  createdAt: '',
  accountId,
  ...guessTemplate(sample)
})
const templates = [
  template(MELLAT_DEBIT.sample, 'tMellat', 'mellat'),
  template(TEJARAT_CREDIT.sample, 'tTejarat', 'tejarat')
]
const accounts = [fixtureAccount('mellat'), fixtureAccount('tejarat')]

/** Mellat debit and Tejarat credit of the same 1,000,000 rial = 100,000 toman. */
const debit = MELLAT_DEBIT.next.replace('90,000', '1,000,000')
const pair = () =>
  reviewSms(
    [sms('d', debit), sms('c', TEJARAT_CREDIT.next, BASE + 60_000)],
    templates,
    accounts,
    'rial'
  )

const leg = (patch: Partial<LedgerEntry>): LedgerEntry => ({
  type: 'expense',
  amount: 1_000_000,
  date: '2026-10-07',
  accountId: 'mellat',
  ...patch
})

const transfer = (ledger: LedgerEntry[]) => {
  const [item] = buildReviewItems(pair(), ledger)

  if (item.kind !== 'transfer') throw new Error('expected a transfer pair')

  return item
}

describe('an own-account transfer pair whose legs the user already recorded', () => {
  it('has no leg flagged when nothing was recorded (the normal one-tap confirm)', () => {
    expect(transfer([]).duplicateLegs).toEqual({ debit: null, credit: null })
  })

  it('flags both legs: expense on the debit account, income on the credit account', () => {
    const item = transfer([
      leg({ id: 'r1' }),
      leg({ id: 'r2', type: 'income', accountId: 'tejarat' })
    ])

    expect(item.duplicateLegs.debit?.id).toBe('r1')
    expect(item.duplicateLegs.credit?.id).toBe('r2')
  })

  it('flags only the leg that exists', () => {
    const item = transfer([leg({ id: 'r1' })])

    expect(item.duplicateLegs.debit?.id).toBe('r1')
    expect(item.duplicateLegs.credit).toBeNull()
  })

  it('accepts a record a day away, not two', () => {
    expect(transfer([leg({ id: 'near', date: '2026-10-08' })]).duplicateLegs.debit?.id).toBe('near')
    expect(transfer([leg({ id: 'far', date: '2026-10-09' })]).duplicateLegs.debit).toBeNull()
  })

  it('ignores a record of another amount, direction or account', () => {
    const item = transfer([
      leg({ id: 'a', amount: 999_999 }),
      leg({ id: 'b', type: 'income' }),
      leg({ id: 'c', accountId: 'tejarat' }),
      leg({ id: 'd', type: 'income', accountId: 'mellat' })
    ])

    expect(item.duplicateLegs).toEqual({ debit: null, credit: null })
  })

  it('a leg record is used once: a later SMS of the same amount is not matched to it', () => {
    const reviewed = reviewSms(
      [
        sms('d', debit),
        sms('c', TEJARAT_CREDIT.next, BASE + 60_000),
        sms('d2', debit, BASE + 3_600_000)
      ],
      templates,
      accounts,
      'rial'
    )
    const items = buildReviewItems(reviewed, [leg({ id: 'r1' })])
    const single = items.find(item => item.kind === 'single')

    expect(single).toMatchObject({ probableDuplicate: false })
  })
})

describe('the next identical transfer after a pair closed as recorded (NEW2)', () => {
  it('is a normal pair again: both legs are covered by the first pair', () => {
    const records = [leg({ id: 'r1' }), leg({ id: 'i1', type: 'income', accountId: 'tejarat' })]
    const coverage = new Map([
      ['r1', 1_000_000],
      ['i1', 1_000_000]
    ])
    const [item] = buildReviewItems(pair(), records, new Set(), undefined, coverage)

    if (item.kind !== 'transfer') throw new Error('expected a transfer pair')
    expect(item.duplicateLegs).toEqual({ debit: null, credit: null })
  })
})

describe('an own-account transfer pair whose transfer is already in «انتقال‌ها»', () => {
  const manual = (patch: Partial<Transfer> = {}): Transfer => ({
    id: 't1',
    createdAt: '',
    date: '2026-10-07',
    fromAccountId: 'mellat',
    toAccountId: 'tejarat',
    amount: 1_000_000,
    note: '',
    createdBy: '',
    ...patch
  })
  const withTransfers = (transfers: Transfer[]) => {
    const [item] = buildReviewItems(pair(), [], new Set(), undefined, undefined, transfers)

    if (item.kind !== 'transfer') throw new Error('expected a transfer pair')

    return item
  }

  it('flags both legs with the transfer, so «قبلاً ثبت شده» closes the pair', () => {
    const item = withTransfers([manual()])

    expect(item.duplicateLegs.debit).toMatchObject({
      id: 't1',
      type: 'expense',
      accountId: 'mellat'
    })
    expect(item.duplicateLegs.credit).toMatchObject({
      id: 't1',
      type: 'income',
      accountId: 'tejarat'
    })
  })

  it('accepts a transfer a day away, not two', () => {
    expect(withTransfers([manual({ date: '2026-10-08' })]).duplicateLegs.debit).not.toBeNull()
    expect(withTransfers([manual({ date: '2026-10-09' })]).duplicateLegs.debit).toBeNull()
  })

  it('ignores a transfer of another amount, direction or account', () => {
    const item = withTransfers([
      manual({ id: 'a', amount: 999_999 }),
      manual({ id: 'b', fromAccountId: 'tejarat', toAccountId: 'mellat' }),
      manual({ id: 'c', toAccountId: 'other' })
    ])

    expect(item.duplicateLegs).toEqual({ debit: null, credit: null })
  })

  it('knows the transfer made from this very pair, whatever its date', () => {
    const own = manual({ id: smsTransferId('d', 'c'), date: '2026-01-01' })

    expect(withTransfers([own]).duplicateLegs.debit?.id).toBe(own.id)
  })

  it('a transfer is used once: the next pair of the same amount is a normal pair again', () => {
    const reviewed = reviewSms(
      [
        sms('d', debit),
        sms('c', TEJARAT_CREDIT.next, BASE + 60_000),
        sms('d2', debit, BASE + 3_600_000),
        sms('c2', TEJARAT_CREDIT.next, BASE + 3_660_000)
      ],
      templates,
      accounts,
      'rial'
    )
    const pairs = buildReviewItems(reviewed, [], new Set(), undefined, undefined, [manual()])

    expect(
      pairs.map(item => (item.kind === 'transfer' ? item.duplicateLegs.debit?.id ?? null : 'x'))
    ).toEqual(['t1', null])
  })
})
