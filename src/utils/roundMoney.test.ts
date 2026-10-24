import { describe, expect, it } from 'vitest'

import { roundMoney, sumMoney } from './roundMoney'

describe('roundMoney', () => {
  it('removes the floating-point noise seen in the sheet', () => {
    expect(roundMoney(0.10000000894069672)).toBe(0.1)
    expect(roundMoney(10931882.299999997)).toBe(10931882.3)
    expect(roundMoney(1640.6000000163913)).toBe(1640.6)
    expect(roundMoney(6741608.899999999)).toBe(6741608.9)
  })

  it('keeps whole numbers whole and keeps two decimals', () => {
    expect(roundMoney(5100000)).toBe(5100000)
    expect(roundMoney(12.34)).toBe(12.34)
    expect(roundMoney(12.345)).toBe(12.35)
    expect(Number.isInteger(roundMoney(1_000_000.000000001))).toBe(true)
  })

  it('treats negatives symmetrically and never returns -0', () => {
    expect(roundMoney(-10931882.299999997)).toBe(-10931882.3)
    expect(roundMoney(-0.004)).toBe(0)
    expect(Object.is(roundMoney(-0.0000001), 0)).toBe(true)
  })

  it('reads non-finite input as 0', () => {
    expect(roundMoney(Number.NaN)).toBe(0)
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('sums fractions without noise', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
    expect(sumMoney([])).toBe(0)
  })
})
