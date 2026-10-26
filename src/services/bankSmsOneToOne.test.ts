import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import type { BankSmsItem } from './bankSmsNative'
import { SMS_RECORD_NOTE } from './bankSmsNote'
import {
  buildReviewItems,
  reviewSms,
  type LedgerEntry,
  type LinkedRecords,
  type ReviewedSms,
  type SmsCoverage
} from './bankSmsQueue'

const mocks = vi.hoisted(() => ({ handled: vi.fn() }))

vi.mock('./bankSmsNative', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  markBankSmsHandled: mocks.handled
}))
vi.mock('./paymentTransactions', () => ({
  createLinkedExpenseRecord: async () => 'rec-new',
  createLinkedIncomeRecord: async () => 'rec-new'
}))
vi.mock('./recordWallet', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  logUnappliedRecord: async () => undefined
}))
vi.mock('./walletFresh', () => ({ refreshWalletAccounts: async () => new Set<string>() }))
vi.mock('./wallet', () => ({ fetchWalletAccounts: async () => [], updateWalletAccount: vi.fn() }))

const { confirmSmsEntryWithId } = await import('./bankSmsApply')
const { smsCoverage } = await import('./bankSmsCoverage')
const { BANK_SMS_PREFS_KEY } = await import('./bankSmsPrefs')

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
function smsOf(id: string, amount: number, dayShift = 0): ReviewedSms {
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

const record = (id: string, amount: number, patch: Partial<LedgerEntry> = {}): LedgerEntry => ({
  type: 'expense',
  amount,
  date: '2026-10-08',
  accountId: 'mellat',
  id,
  ...patch
})
const linkedTo = (...pairs: [string, string][]): LinkedRecords =>
  new Map(pairs.map(([id, title]) => [id, { kind: 'dang', noun: 'بدهی', title }]))

const singles = (items: ReturnType<typeof buildReviewItems>) =>
  items.map(item => {
    if (item.kind !== 'single') throw new Error('expected single cards')

    return item
  })

const M20 = 20_000_000
const M10 = 10_000_000

describe('a record created from an SMS belongs to that SMS', () => {
  it('30M debt: SMS 20M saved (R1), a real second SMS 10M is NOT a part of R1', () => {
    const r1 = record('r1', M20, { note: SMS_RECORD_NOTE, date: '2026-10-06' })
    const [card] = singles(
      buildReviewItems([smsOf('m2', M10)], [r1], new Set(), linkedTo(['r1', 'وام بزرگ']))
    )

    expect(card).toMatchObject({
      probableDuplicate: false,
      duplicateOf: null,
      duplicatePayment: null,
      splitUncovered: null
    })
  })

  it('the same by coverage alone (a record without the SMS note, e.g. made in the form)', () => {
    const r1 = record('r1', M20, { date: '2026-10-06' })
    const coverage: SmsCoverage = new Map([['r1', M20]])
    const [card] = singles(
      buildReviewItems([smsOf('m2', M10)], [r1], new Set(), linkedTo(['r1', 'x']), coverage)
    )

    expect(card).toMatchObject({ probableDuplicate: false, splitUncovered: null })
  })

  it('a later equal SMS (2 days on) is not a «recorded payment» of the SMS-made record', () => {
    const r1 = record('r1', M20, { note: SMS_RECORD_NOTE, date: '2026-10-08' })
    const [card] = singles(
      buildReviewItems([smsOf('m2', M20, 2)], [r1], new Set(), linkedTo(['r1', 'x']))
    )

    expect(card).toMatchObject({ probableDuplicate: false, duplicatePayment: null })
  })

  it('within a day it is only an ordinary «تکراری؟», never a named payment', () => {
    const r1 = record('r1', M20, { note: SMS_RECORD_NOTE })
    const coverage: SmsCoverage = new Map([['r1', M20]])
    const [card] = singles(
      buildReviewItems([smsOf('m2', M20)], [r1], new Set(), linkedTo(['r1', 'x']), coverage)
    )

    expect(card).toMatchObject({ probableDuplicate: true, duplicatePayment: null })
  })

  it('a payment made on its own page (no SMS note, not covered) still matches an SMS', () => {
    const r1 = record('r1', M20, { date: '2026-10-06' })
    const [card] = singles(
      buildReviewItems([smsOf('m1', M20)], [r1], new Set(), linkedTo(['r1', 'وام']))
    )

    expect(card).toMatchObject({ probableDuplicate: true, duplicatePayment: { title: 'وام' } })
  })
})

describe('matching is one-to-one inside a list', () => {
  it('two equal SMS, one payment record: the first takes it, the second is new', () => {
    const r1 = record('r1', 5_000_000)
    const [first, second] = singles(
      buildReviewItems(
        [smsOf('m1', 5_000_000), smsOf('m2', 5_000_000)],
        [r1],
        new Set(),
        linkedTo(['r1', 'قسط وام'])
      )
    )

    expect(first).toMatchObject({ probableDuplicate: true, duplicatePayment: { title: 'قسط وام' } })
    expect(second).toMatchObject({ probableDuplicate: false, duplicatePayment: null })
  })

  it('two equal SMS, one ordinary record: the second SMS is new too', () => {
    const [first, second] = singles(
      buildReviewItems([smsOf('m1', 5_000_000), smsOf('m2', 5_000_000)], [record('r1', 5_000_000)])
    )

    expect(first.probableDuplicate).toBe(true)
    expect(second.probableDuplicate).toBe(false)
  })

  it('two equal records on two debts: each SMS names its own debt', () => {
    const ledger = [
      record('r1', 5_000_000, { createdAtMs: 1 }),
      record('r2', 5_000_000, { createdAtMs: 2 })
    ]
    const cards = singles(
      buildReviewItems(
        [smsOf('m1', 5_000_000), smsOf('m2', 5_000_000)],
        ledger,
        new Set(),
        linkedTo(['r1', 'وام یک'], ['r2', 'وام دو'])
      )
    )
    const names = cards.map(card => card.duplicatePayment?.title)

    expect(new Set(names).size).toBe(2)
    expect(names).toContain('وام یک')
    expect(names).toContain('وام دو')
  })

  it('three SMS of 10M against one payment of 20M: only two are parts of it', () => {
    const cards = singles(
      buildReviewItems(
        [smsOf('m1', M10), smsOf('m2', M10), smsOf('m3', M10)],
        [record('r1', M20, { date: '2026-10-07' })],
        new Set(),
        linkedTo(['r1', 'وام'])
      )
    )

    expect(cards.map(card => card.splitUncovered)).toEqual([M20, M10, null])
    expect(cards.map(card => card.probableDuplicate)).toEqual([true, true, false])
  })
})

describe('creating a record from an SMS writes its coverage', () => {
  beforeEach(() => {
    localStorage.removeItem(BANK_SMS_PREFS_KEY)
    mocks.handled.mockReset()
  })

  it('card save: the SMS covers the whole new record', async () => {
    const entry = { ...smsOf('m1', M20), balance: null } as never

    const id = await confirmSmsEntryWithId('sid', entry, {
      title: 'خرید',
      category: 'بدهی',
      subCategory: ''
    })

    expect(id).toBe('rec-new')
    expect(smsCoverage().get('rec-new')).toBe(M20)
  })

  it('«فقط موجودی» creates no record and so no coverage', async () => {
    await confirmSmsEntryWithId('sid', { ...smsOf('m1', M20), balance: null } as never, null)

    expect(smsCoverage().size).toBe(0)
  })
})
