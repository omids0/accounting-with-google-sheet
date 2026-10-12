import { describe, expect, it } from 'vitest'

import { BANK_SMS_FIXTURES } from './bankSmsFixtures'
import { guessTemplate, validateTemplateParts } from './bankSmsGuess'
import type { SmsTemplatePart } from '../types'

const capturedRoles = (parts: SmsTemplatePart[]) =>
  parts.flatMap(part => (part.kind === 'slot' && part.role !== 'ignore' ? [part.role] : []))

describe('guessTemplate', () => {
  it.each(BANK_SMS_FIXTURES)('guesses roles and direction for $bank', fixture => {
    const guess = guessTemplate(fixture.sample)

    expect(capturedRoles(guess.parts)).toEqual(fixture.roles)
    expect(guess.direction).toBe(fixture.direction)
  })

  it.each(BANK_SMS_FIXTURES)('stores no digit from the $bank sample', fixture => {
    expect(JSON.stringify(guessTemplate(fixture.sample).parts)).not.toMatch(/\d/)
  })

  it('reads the unit from «تومان», otherwise rial', () => {
    expect(guessTemplate('برداشت 1,000 تومان').unit).toBe('toman')
    expect(guessTemplate('برداشت 1,000 ریال').unit).toBe('rial')
  })

  it('falls back to the first unlabelled amount when no keyword names one', () => {
    expect(capturedRoles(guessTemplate('بانک آینده 250,000 مانده 900,000').parts)).toEqual([
      'amount',
      'balance'
    ])
  })

  it('keeps only the first of two balances', () => {
    expect(capturedRoles(guessTemplate('برداشت 10,000 مانده 50,000 موجودی 60,000').parts)).toEqual([
      'amount',
      'balance'
    ])
  })
})

describe('validateTemplateParts', () => {
  const slot = (role: 'amount' | 'balance' | 'accountRef' | 'ignore'): SmsTemplatePart => ({
    kind: 'slot',
    role
  })

  it('accepts one amount with optional balance and reference', () => {
    expect(validateTemplateParts([slot('amount'), slot('balance'), slot('accountRef')])).toEqual([])
  })

  it('names every problem', () => {
    expect(validateTemplateParts([slot('ignore')])).toEqual(['amount-missing'])
    expect(
      validateTemplateParts([
        slot('amount'),
        slot('amount'),
        slot('balance'),
        slot('balance'),
        slot('accountRef'),
        slot('accountRef')
      ])
    ).toEqual(['amount-multiple', 'balance-multiple', 'accountRef-multiple'])
  })
})

describe('guessTemplate with a tapped amount', () => {
  const text = 'بانک آینده خرید 250,000 مانده 900,000'
  // Tokens: text, 250,000, text, 900,000
  const AMOUNT = 1
  const BALANCE = 3

  it('makes the tapped number the only amount', () => {
    const guess = guessTemplate(text, [], BALANCE)

    expect(guess.parts[BALANCE]).toEqual({ kind: 'slot', role: 'amount' })
    expect(guess.parts[AMOUNT]).toEqual({ kind: 'slot', role: 'ignore' })
    expect(validateTemplateParts(guess.parts)).toEqual([])
  })

  it('keeps the other guessed roles', () => {
    expect(capturedRoles(guessTemplate(text, [], AMOUNT).parts)).toEqual(['amount', 'balance'])
  })

  it('pins the tap over a same-shape saved template', () => {
    const saved = { id: 't', createdAt: '', accountId: 'a', ...guessTemplate(text) }
    const guess = guessTemplate(text.replace('250,000', '90,000'), [saved], BALANCE)

    expect(guess.parts[BALANCE]).toEqual({ kind: 'slot', role: 'amount' })
    expect(guess.direction).toBe(saved.direction)
  })
})
