import { describe, expect, it } from 'vitest'

import { toAppCurrency } from './bankSmsAmount'

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
