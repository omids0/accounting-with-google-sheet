import { describe, expect, it } from 'vitest'

import {
  MINUS_SIGN,
  formatCompactNumber,
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
