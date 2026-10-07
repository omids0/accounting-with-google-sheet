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
