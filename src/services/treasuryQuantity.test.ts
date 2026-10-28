import { describe, expect, it } from 'vitest'

import {
  LARGE_QUANTITY,
  LARGE_QUANTITY_HINT,
  largeQuantityHint,
  quantityInputNotice
} from './treasuryQuantity'
import { AMOUNT_DIGITS_ONLY_MESSAGE, AMOUNT_NEGATIVE_MESSAGE } from '../utils/amountInput'

describe('quantityInputNotice', () => {
  it.each(['-3', '−3', '–3', '-۳'])('tells the user a minus sign is not taken: %s', raw => {
    expect(quantityInputNotice(raw)).toBe(AMOUNT_NEGATIVE_MESSAGE)
  })

  it('tells the user scientific notation is dropped', () => {
    expect(quantityInputNotice('1e3')).toBe(AMOUNT_DIGITS_ONLY_MESSAGE)
  })

  it('is silent for plain and decimal quantities', () => {
    expect(quantityInputNotice('2.5')).toBe('')
    expect(quantityInputNotice('۳')).toBe('')
    expect(quantityInputNotice('')).toBe('')
  })
})

describe('largeQuantityHint', () => {
  it('flags an absurd quantity without blocking', () => {
    expect(largeQuantityHint(1_000_000)).toBe(LARGE_QUANTITY_HINT)
  })

  it('accepts a generous quantity quietly', () => {
    expect(largeQuantityHint(LARGE_QUANTITY)).toBe('')
    expect(largeQuantityHint(25)).toBe('')
    expect(largeQuantityHint('')).toBe('')
  })
})
