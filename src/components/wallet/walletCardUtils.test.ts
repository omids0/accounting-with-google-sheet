import { describe, expect, it } from 'vitest'

import { cardNumberError, shebaError } from './walletCardUtils'

const GOOD_CARD = '6037 9917 4000 0009'
const BAD_CARD = '1234 5678 1234 5678'
const SHEBA = 'IR270170000000100324200001'

describe('cardNumberError', () => {
  it('accepts a Luhn-valid 16 digit card, also typed with Persian digits', () => {
    expect(cardNumberError(GOOD_CARD, '')).toBe(true)
    expect(cardNumberError('۶۰۳۷۹۹۱۷۴۰۰۰۰۰۰۹', '')).toBe(true)
  })

  it('asks for 16 digits first, then for a real card', () => {
    expect(cardNumberError('6037 9917', '')).toBe('شماره کارت باید ۱۶ رقم باشد')
    expect(cardNumberError(BAD_CARD, '')).toBe('شماره کارت معتبر نیست')
  })

  it('keeps a saved card editable until its number changes', () => {
    expect(cardNumberError(BAD_CARD, BAD_CARD)).toBe(true)
    expect(cardNumberError('1234 5678 1234 5679', BAD_CARD)).toBe('شماره کارت معتبر نیست')
  })
})

describe('shebaError', () => {
  it('lets the field stay empty', () => {
    expect(shebaError('', '')).toBe(true)
    expect(shebaError('   ', '')).toBe(true)
  })

  it('accepts a valid Sheba in any common notation', () => {
    expect(shebaError(SHEBA, '')).toBe(true)
    expect(shebaError('ir27 0170 0000 0010 0324 2000 01', '')).toBe(true)
  })

  it('rejects a wrong Sheba but not a saved one that was left alone', () => {
    expect(shebaError('IR12 3456 7890', '')).toBe('شماره شبا معتبر نیست')
    expect(shebaError('IR12 3456 7890', 'IR12 3456 7890')).toBe(true)
  })
})
