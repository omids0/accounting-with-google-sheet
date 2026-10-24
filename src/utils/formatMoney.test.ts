import { describe, expect, it } from 'vitest'

import {
  MINUS_SIGN,
  formatCompactNumber,
  formatMoneyParts,
  formatPersianNumber,
  formatSignedNumber
} from './formatMoney'

const LRI = '\u2066'
const PDI = '\u2069'

describe('formatCompactNumber', () => {
  it('uses Persian digits and units', () => {
    expect(formatCompactNumber(3_500_000)).toBe(`${formatPersianNumber(3.5)} م`)
    expect(formatCompactNumber(12_400_000)).toBe(`${formatPersianNumber(12.4)} م`)
    expect(formatCompactNumber(120_000)).toBe(`${formatPersianNumber(120)} ه`)
    expect(formatCompactNumber(1_200_000_000)).toBe(`${formatPersianNumber(1.2)} میلیارد`)
    expect(formatCompactNumber(0)).toBe(formatPersianNumber(0))
  })

  it('never emits Latin digits or units', () => {
    expect(formatCompactNumber(94_942_067)).not.toMatch(/[0-9MKB]/)
  })

  it('keeps the minus attached', () => {
    expect(formatCompactNumber(-2_000_000)).toBe(
      `${LRI}${MINUS_SIGN}${formatPersianNumber(2)}${PDI} م`
    )
  })
})

describe('formatSignedNumber', () => {
  it('attaches the sign with no space', () => {
    expect(formatSignedNumber(-170_000)).toBe(
      `${LRI}${MINUS_SIGN}${formatPersianNumber(170_000)}${PDI}`
    )
    expect(formatSignedNumber(5, { showPlus: true })).toBe(`${LRI}+${formatPersianNumber(5)}${PDI}`)
    expect(formatSignedNumber(5)).toBe(formatPersianNumber(5))
  })
})

describe('money formatting hides floating-point noise', () => {
  it('rounds residual noise away without touching whole amounts', () => {
    expect(formatMoneyParts(10931882.299999997).number).toBe(formatPersianNumber(10931882.3))
    expect(formatMoneyParts(0.10000000894069672).number).toBe(formatPersianNumber(0.1))
    expect(formatMoneyParts(6741608.899999999).number).toBe(formatPersianNumber(6741608.9))
    expect(formatMoneyParts(5_100_000).number).toBe(formatPersianNumber(5_100_000))
  })

  it('never prints «−۰» for a tiny negative', () => {
    expect(formatSignedNumber(-0.0000001)).toBe(formatPersianNumber(0))
    expect(formatSignedNumber(-0.0000001, { showPlus: true })).toBe(formatPersianNumber(0))
  })
})
