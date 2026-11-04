import { describe, expect, it } from 'vitest'

import {
  MAX_SMS_AMOUNT_TOMAN,
  toAppCurrency,
  usableSmsAmount,
  usableSmsBalance
} from './bankSmsAmount'

describe('toAppCurrency', () => {
  it('converts between rial and toman', () => {
    expect(toAppCurrency(1_250_000, 'rial', 'toman')).toBe(125_000)
    expect(toAppCurrency(125_000, 'toman', 'rial')).toBe(1_250_000)
    expect(toAppCurrency(5_000, 'rial', 'rial')).toBe(5_000)
  })

  it('refuses foreign app currencies', () => {
    expect(toAppCurrency(1_000, 'rial', 'usd')).toBeNull()
    expect(toAppCurrency(1_000, 'toman', 'eur')).toBeNull()
  })
})

describe('usableSmsAmount', () => {
  it('keeps normal amounts, including large building charges', () => {
    expect(usableSmsAmount(90_000, 'toman')).toBe(90_000)
    expect(usableSmsAmount(85_420_000, 'toman')).toBe(85_420_000)
  })

  it('refuses zero, negative and non-finite amounts', () => {
    expect(usableSmsAmount(0, 'toman')).toBeNull()
    expect(usableSmsAmount(-5, 'toman')).toBeNull()
    expect(usableSmsAmount(Number.NaN, 'toman')).toBeNull()
    expect(usableSmsAmount(Number.POSITIVE_INFINITY, 'rial')).toBeNull()
    expect(usableSmsAmount(null, 'toman')).toBeNull()
  })

  it('accepts exactly the cap and refuses anything above it', () => {
    expect(usableSmsAmount(MAX_SMS_AMOUNT_TOMAN, 'toman')).toBe(MAX_SMS_AMOUNT_TOMAN)
    expect(usableSmsAmount(MAX_SMS_AMOUNT_TOMAN + 1, 'toman')).toBeNull()
  })

  it('scales the cap to rial books', () => {
    expect(usableSmsAmount(MAX_SMS_AMOUNT_TOMAN * 10, 'rial')).toBe(MAX_SMS_AMOUNT_TOMAN * 10)
    expect(usableSmsAmount(MAX_SMS_AMOUNT_TOMAN * 10 + 1, 'rial')).toBeNull()
  })
})

describe('usableSmsBalance', () => {
  it('drops a balance that is not a number or above the cap, keeps the rest', () => {
    expect(usableSmsBalance(8_340_000, 'toman')).toBe(8_340_000)
    expect(usableSmsBalance(0, 'toman')).toBe(0)
    expect(usableSmsBalance(-250_000, 'toman')).toBe(-250_000)
    expect(usableSmsBalance(Number.NaN, 'toman')).toBeNull()
    expect(usableSmsBalance(MAX_SMS_AMOUNT_TOMAN, 'toman')).toBe(MAX_SMS_AMOUNT_TOMAN)
    expect(usableSmsBalance(MAX_SMS_AMOUNT_TOMAN + 1, 'toman')).toBeNull()
    expect(usableSmsBalance(-MAX_SMS_AMOUNT_TOMAN - 1, 'toman')).toBeNull()
  })
})
