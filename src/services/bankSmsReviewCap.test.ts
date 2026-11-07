import { describe, expect, it } from 'vitest'

import { MAX_SMS_AMOUNT_TOMAN } from './bankSmsAmount'
import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import type { BankSmsItem } from './bankSmsNative'
import { buildReviewItems, isConfirmable, reviewSms } from './bankSmsQueue'
import { routeSharedText } from './bankSmsShare'
import type { SmsTemplate } from '../types'

const [MELLAT_DEBIT] = BANK_SMS_FIXTURES
const BASE = new Date(2026, 9, 7, 12, 0).getTime()
const templates: SmsTemplate[] = [
  { id: 'tMellat', createdAt: '', accountId: 'mellat', ...guessTemplate(MELLAT_DEBIT.sample) }
]
const accounts = [fixtureAccount('mellat')]

/** The Mellat debit SMS (rial) with its amount and balance replaced. */
function body(amount: string, balance = '8,340,000'): string {
  return MELLAT_DEBIT.next.replace('90,000', amount).replace('8,340,000', balance)
}

function review(text: string, currency: 'toman' | 'rial' = 'toman') {
  const item: BankSmsItem = {
    id: 'x',
    sender: '+98700',
    body: text,
    receivedAt: BASE,
    source: 'live'
  }

  return reviewSms([item], templates, accounts, currency)[0]
}

describe('reviewSms amount sanity', () => {
  it('keeps a normal amount and balance confirmable', () => {
    const entry = review(body('90,000'))

    expect(isConfirmable(entry)).toBe(true)
    expect(entry).toMatchObject({ amount: 9000, balance: 834000 })
  })

  it('keeps a large building charge (85,420,000 toman)', () => {
    const entry = review(body('854,200,000'))

    expect(isConfirmable(entry)).toBe(true)
    expect(entry.amount).toBe(85_420_000)
  })

  it('turns a zero amount into an unknown card', () => {
    const entry = review(body('0'))

    expect(entry.result.kind).toBe('unknown')
    expect(entry).toMatchObject({ amount: null, balance: null })
    expect(isConfirmable(entry)).toBe(false)
  })

  it('accepts exactly the cap and refuses one toman above it', () => {
    const atCap = review(body(String(MAX_SMS_AMOUNT_TOMAN * 10)))
    const above = review(body(String(MAX_SMS_AMOUNT_TOMAN * 10 + 10)))

    expect(isConfirmable(atCap)).toBe(true)
    expect(atCap.amount).toBe(MAX_SMS_AMOUNT_TOMAN)
    expect(above.result.kind).toBe('unknown')
    expect(isConfirmable(above)).toBe(false)
  })

  it('refuses the spoofed 999,999,999,999,999,999 rial amount, in toman and rial books', () => {
    for (const currency of ['toman', 'rial'] as const) {
      const entry = review(body('999999999999999999'), currency)

      expect(entry.result.kind).toBe('unknown')
      expect(entry.amount).toBeNull()
    }
  })

  it('leaves a negative or non-numeric amount unusable too', () => {
    // A «-» next to the number is not captured, so the digits alone decide; letters never match.
    expect(review(MELLAT_DEBIT.next.replace('90,000', 'abc')).result.kind).not.toBe('matched')
  })

  it('drops a balance above the cap but keeps the amount confirmable', () => {
    const entry = review(body('90,000', '999999999999999999'))

    expect(isConfirmable(entry)).toBe(true)
    expect(entry.balance).toBeNull()
  })

  it('never pairs an unusable amount into a transfer or a card', () => {
    const items = buildReviewItems([review(body('0')), review(body('999999999999999999'))], [])

    expect(items.every(item => item.kind === 'single')).toBe(true)
    expect(items.every(item => item.kind === 'single' && !isConfirmable(item.entry))).toBe(true)
  })
})

describe('isConfirmable', () => {
  it('refuses a hand-built entry with a zero, negative or NaN amount', () => {
    const entry = review(body('90,000'))

    for (const amount of [0, -1, Number.NaN]) {
      expect(isConfirmable({ ...entry, amount })).toBe(false)
    }
  })
})

describe('routeSharedText amount sanity', () => {
  it('sends a zero or absurd shared amount to the unknown card', () => {
    expect(routeSharedText(body('0'), templates, accounts, 'toman').kind).toBe('unknown')
    expect(routeSharedText(body('999999999999999999'), templates, accounts, 'toman').kind).toBe(
      'unknown'
    )
    expect(routeSharedText(body('90,000'), templates, accounts, 'toman').kind).toBe('entry')
  })
})
