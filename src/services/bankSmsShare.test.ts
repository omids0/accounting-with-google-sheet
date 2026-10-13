import { describe, expect, it } from 'vitest'

import { SMS_RECORD_NOTE } from './bankSmsApply'
import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import { routeSharedText, sharedSmsEntry } from './bankSmsShare'
import { WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'
import type { SmsTemplate } from '../types'

const [MELLAT_DEBIT, MELLAT_CREDIT] = BANK_SMS_FIXTURES
const NOW = new Date(2026, 9, 12, 10, 0).getTime()

function templateFrom(sample: string, id: string, accountId: string): SmsTemplate {
  return { id, createdAt: '', accountId, ...guessTemplate(sample) }
}

const mellat = fixtureAccount('mellat', { cardNumber: '6104337812341234' })
const templates = [
  templateFrom(MELLAT_DEBIT.sample, 't-debit', 'mellat'),
  templateFrom(MELLAT_CREDIT.sample, 't-credit', 'mellat')
]

describe('routeSharedText', () => {
  it('opens a pre-filled expense form for a recognised withdrawal', () => {
    const route = routeSharedText(MELLAT_DEBIT.next, templates, [mellat], 'toman', {}, NOW)

    expect(route).toMatchObject({ kind: 'entry', formType: 'expense' })
    if (route.kind !== 'entry') return
    // Rial in the SMS, toman in the app.
    expect(route.prefill.amount).toBe(9000)
    expect(route.prefill[WALLET_ACCOUNT_FIELD_ID]).toBe('mellat')
    expect(route.prefill.note).toBe(SMS_RECORD_NOTE)
    expect(route.prefill.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('opens an income form for a recognised deposit', () => {
    const route = routeSharedText(MELLAT_CREDIT.next, templates, [mellat], 'rial', {}, NOW)

    expect(route).toMatchObject({ kind: 'entry', formType: 'income' })
    if (route.kind === 'entry') expect(route.prefill.amount).toBe(500000)
  })

  it('leaves the account empty when the digits fit several accounts', () => {
    const other = fixtureAccount('other', { cardNumber: '5022291012341234' })
    const both = [...templates, templateFrom(MELLAT_DEBIT.sample, 't-other', 'other')]
    const route = routeSharedText(MELLAT_DEBIT.next, both, [mellat, other], 'rial', {}, NOW)

    expect(route).toMatchObject({ kind: 'entry', formType: 'expense' })
    if (route.kind === 'entry') expect(route.prefill[WALLET_ACCOUNT_FIELD_ID]).toBe('')
  })

  it('sends unknown or unusable text to the «پیامک ناشناخته» card', () => {
    expect(routeSharedText(MELLAT_DEBIT.next, [], [mellat], 'rial')).toEqual({ kind: 'unknown' })
    expect(routeSharedText('سلام، فردا می‌بینمت', templates, [mellat], 'rial')).toEqual({
      kind: 'unknown'
    })
    // A foreign app currency cannot take a bank SMS amount.
    expect(routeSharedText(MELLAT_DEBIT.next, templates, [mellat], 'usd')).toEqual({
      kind: 'unknown'
    })
  })
})

describe('sharedSmsEntry', () => {
  it('wraps the text as an unknown queue entry', () => {
    const entry = sharedSmsEntry('متن', NOW)

    expect(entry.result.kind).toBe('unknown')
    expect(entry.sms).toMatchObject({ body: 'متن', receivedAt: NOW, sender: '' })
  })
})
