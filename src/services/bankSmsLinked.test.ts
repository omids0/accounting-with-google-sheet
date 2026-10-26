import { describe, expect, it, vi } from 'vitest'

import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import { linkedRecordsFor } from './bankSmsLinked'
import type { BankSmsItem } from './bankSmsNative'
import {
  buildReviewItems,
  isProbableDuplicate,
  LINKED_PAYMENT_DAYS,
  reviewSms,
  type LedgerEntry,
  type LinkedRecords
} from './bankSmsQueue'
import type { RecordLinkMatch } from './recordLinkCore'
import { SETTLE_DUPLICATE_DAYS } from './settleDuplicates'

const [MELLAT_DEBIT, , , , , TEJARAT_CREDIT] = BANK_SMS_FIXTURES
/** 2026-10-08 12:00, the day of the SMS. */
const BASE = new Date(2026, 9, 8, 12, 0).getTime()

const sms = (id: string, body: string): BankSmsItem => ({
  id,
  sender: '+98700',
  body,
  receivedAt: BASE,
  source: 'live'
})
const template = (sample: string, id: string, accountId: string) => ({
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
const debitSms = () => reviewSms([sms('a', MELLAT_DEBIT.next)], templates, accounts, 'toman')
const creditSms = () => reviewSms([sms('c', TEJARAT_CREDIT.next)], templates, accounts, 'toman')

const record = (patch: Partial<LedgerEntry>): LedgerEntry => ({
  type: 'expense',
  amount: 9000,
  date: '2026-10-08',
  accountId: '',
  id: 'r1',
  ...patch
})
const linkedTo = (id: string, noun = 'بدهی', title = 'وام دوست'): LinkedRecords =>
  new Map([[id, { kind: noun === 'طلب' ? 'receivable' : 'dang', noun, title }]])

const single = (items: ReturnType<typeof buildReviewItems>) => {
  const [item] = items

  if (item.kind !== 'single') throw new Error('expected a single card')

  return item
}

describe('buildReviewItems: a record that is a debt or receivable payment', () => {
  it('names the payment when the same-day record is linked', () => {
    const item = single(buildReviewItems(debitSms(), [record({})], new Set(), linkedTo('r1')))

    expect(item).toMatchObject({
      probableDuplicate: true,
      duplicateOf: { id: 'r1' },
      duplicatePayment: { noun: 'بدهی', title: 'وام دوست' }
    })
  })

  it('matches a linked payment up to three days away, not four', () => {
    const near = [record({ date: '2026-10-05' }), record({ id: 'r2', date: '2026-10-11' })]
    const far = [record({ date: '2026-10-04' }), record({ id: 'r2', date: '2026-10-12' })]
    const linked = new Map([...linkedTo('r1'), ...linkedTo('r2')])

    expect(single(buildReviewItems(debitSms(), near, new Set(), linked))).toMatchObject({
      probableDuplicate: true,
      duplicatePayment: { title: 'وام دوست' }
    })
    expect(single(buildReviewItems(debitSms(), far, new Set(), linked))).toMatchObject({
      probableDuplicate: false,
      duplicatePayment: null
    })
  })

  it('keeps one day for an ordinary record, even with linked ones in the ledger', () => {
    const twoDays = [record({ id: 'plain', date: '2026-10-10' })]
    const oneDay = [record({ id: 'plain', date: '2026-10-09' })]

    expect(
      single(buildReviewItems(debitSms(), twoDays, new Set(), linkedTo('other')))
    ).toMatchObject({ probableDuplicate: false })
    expect(single(buildReviewItems(debitSms(), oneDay))).toMatchObject({
      probableDuplicate: true,
      duplicatePayment: null
    })
  })

  it('ignores a linked record of another amount or direction', () => {
    const ledger = [record({ amount: 8999 }), record({ id: 'r2', type: 'income' })]
    const linked = new Map([...linkedTo('r1'), ...linkedTo('r2')])

    expect(single(buildReviewItems(debitSms(), ledger, new Set(), linked))).toMatchObject({
      probableDuplicate: false,
      duplicatePayment: null
    })
  })

  it('names a receivable collected by an incoming SMS', () => {
    const credit = creditSms()
    const ledger = [record({ type: 'income', amount: credit[0].amount ?? 0, date: '2026-10-06' })]

    expect(credit[0].amount).toBeGreaterThan(0)
    expect(
      single(buildReviewItems(credit, ledger, new Set(), linkedTo('r1', 'طلب', 'علی')))
    ).toMatchObject({ duplicatePayment: { noun: 'طلب', title: 'علی' } })
  })

  it('prefers the payment record over a newer ordinary one for the badge', () => {
    const ledger = [
      record({ id: 'pay', date: '2026-10-07', createdAtMs: 1 }),
      record({ id: 'plain', date: '2026-10-08', createdAtMs: 9 })
    ]

    expect(single(buildReviewItems(debitSms(), ledger, new Set(), linkedTo('pay')))).toMatchObject({
      duplicateOf: { id: 'pay' },
      duplicatePayment: { title: 'وام دوست' }
    })
  })

  it('knows whether the payment moved this account; «بدون حساب» or «اثر: خیر» did not', () => {
    const moved = (patch: Partial<LedgerEntry>) =>
      single(buildReviewItems(debitSms(), [record(patch)], new Set(), linkedTo('r1')))
        .duplicateMovedBalance

    expect(moved({ accountId: 'mellat' })).toBe(true)
    expect(moved({ accountId: '' })).toBe(false)
    expect(moved({ accountId: 'mellat', moved: false })).toBe(false)
    expect(moved({ accountId: 'tejarat' })).toBe(false)
  })

  it('judges the balance by the payment record, not by another match', () => {
    const ledger = [
      record({ id: 'pay', accountId: '', createdAtMs: 9 }),
      record({ id: 'plain', accountId: 'mellat', createdAtMs: 1 })
    ]
    const item = single(buildReviewItems(debitSms(), ledger, new Set(), linkedTo('pay')))

    expect(item).toMatchObject({ duplicateOf: { id: 'pay' }, duplicateMovedBalance: false })
    expect(single(buildReviewItems(debitSms(), ledger)).duplicateMovedBalance).toBe(true)
  })

  it('uses the same window as the settle duplicate check', () => {
    expect(LINKED_PAYMENT_DAYS).toBe(SETTLE_DUPLICATE_DAYS)
  })
})

describe('linkedRecordsFor', () => {
  const match = (title: string): RecordLinkMatch => ({
    kind: 'dang',
    noun: 'بدهی',
    itemId: 'd1',
    title,
    paymentIds: ['p1']
  })

  it('asks only about records that could match an SMS and keeps the linked ones', () => {
    const find = vi.fn((id: string) => (id === 'pay' ? [match('وام')] : []))
    const ledger = [
      record({ id: 'pay', date: '2026-10-06' }),
      record({ id: 'plain' }),
      record({ id: 'late', date: '2026-10-20' }),
      record({ id: 'other', amount: 5 }),
      record({ id: 'income', type: 'income' }),
      record({ id: undefined })
    ]
    const linked = linkedRecordsFor(debitSms(), ledger, find)

    expect([...linked.keys()]).toEqual(['pay'])
    expect(find.mock.calls.map(call => call[0])).toEqual(['pay', 'plain'])
    expect(find).toHaveBeenCalledWith('pay', 'expense')
  })

  it('looks up nothing without a recognised SMS', () => {
    const find = vi.fn(() => [match('x')])

    expect(linkedRecordsFor([], [record({})], find).size).toBe(0)
    expect(find).not.toHaveBeenCalled()
  })
})

describe('buildReviewItems: an SMS smaller than a payment record (one payment, several SMS)', () => {
  const big = (patch: Partial<LedgerEntry> = {}) => record({ amount: 20000, ...patch })
  const items = (
    ledger: LedgerEntry[],
    linked = linkedTo('r1'),
    coverage = new Map<string, number>()
  ) => single(buildReviewItems(debitSms(), ledger, new Set(), linked, coverage))

  it('offers the record with its uncovered amount, and never makes a new record of the SMS', () => {
    expect(items([big()])).toMatchObject({
      probableDuplicate: true,
      duplicateOf: { id: 'r1' },
      duplicatePayment: { title: 'وام دوست' },
      splitUncovered: 20000
    })
  })

  it('shrinks the uncovered amount with every SMS closed as a part of it', () => {
    expect(items([big()], linkedTo('r1'), new Map([['r1', 11000]]))).toMatchObject({
      splitUncovered: 9000
    })
    // both 9000 SMS are in: the record is covered, the next one is an ordinary card
    expect(items([big()], linkedTo('r1'), new Map([['r1', 12000]]))).toMatchObject({
      probableDuplicate: false,
      splitUncovered: null
    })
  })

  it('does not offer a record that is not linked, too far away, or not bigger', () => {
    expect(items([big()], linkedTo('other')).probableDuplicate).toBe(false)
    expect(items([big({ date: '2026-10-04' })]).probableDuplicate).toBe(false)
    expect(items([big({ type: 'income' })]).probableDuplicate).toBe(false)
    expect(items([big({ date: '2026-10-05' })]).splitUncovered).toBe(20000)
  })

  it('gives an exact match precedence over a split', () => {
    const ledger = [big(), record({ id: 'exact', amount: 9000, date: '2026-10-08' })]

    expect(items(ledger, linkedTo('exact'))).toMatchObject({
      duplicateOf: { id: 'exact' },
      duplicatePayment: { title: 'وام دوست' },
      splitUncovered: null
    })
    expect(items(ledger).splitUncovered).toBeNull()
  })

  it('stops offering the exact payment once SMS covered a part of it', () => {
    const exact = [record({ id: 'r1', date: '2026-10-06' })]

    expect(items(exact).duplicatePayment).toBeTruthy()
    expect(items(exact, linkedTo('r1'), new Map([['r1', 100]])).probableDuplicate).toBe(false)
  })

  it('picks the closest fit, then the newest, the same way every time', () => {
    const linked = new Map([...linkedTo('a'), ...linkedTo('b'), ...linkedTo('c')])
    const ledger = [
      big({ id: 'a', amount: 30000 }),
      big({ id: 'b', amount: 15000, date: '2026-10-07' }),
      big({ id: 'c', amount: 15000, date: '2026-10-08' })
    ]

    expect(items(ledger, linked).duplicateOf?.id).toBe('c')
    expect(items([...ledger].reverse(), linked).duplicateOf?.id).toBe('c')
    expect(items(ledger, linked, new Map([['c', 8000]])).duplicateOf?.id).toBe('b')
  })

  it('reports the balance by the record it is a part of', () => {
    expect(items([big({ accountId: 'mellat' })]).duplicateMovedBalance).toBe(true)
    expect(items([big({ accountId: '' })]).duplicateMovedBalance).toBe(false)
  })

  it('is a probable duplicate for the reconcile wizard too', () => {
    const [entry] = debitSms()
    const linked = linkedTo('r1')

    expect(isProbableDuplicate(entry, [big()])).toBe(false)
    expect(isProbableDuplicate(entry, [big()], linked)).toBe(true)
    expect(isProbableDuplicate(entry, [big()], linked, new Map([['r1', 12000]]))).toBe(false)
    expect(isProbableDuplicate(entry, [record({ date: '2026-10-06' })], linked)).toBe(true)
    expect(isProbableDuplicate(entry, [record({ date: '2026-10-06' })])).toBe(false)
  })

  it('asks the link lookup about bigger records of the window as well', () => {
    const find = vi.fn((_id: string) => [] as RecordLinkMatch[])

    linkedRecordsFor(debitSms(), [big({ id: 'big' }), record({ id: 'small', amount: 5 })], find)
    expect(find.mock.calls.map(call => call[0])).toEqual(['big'])
  })
})
