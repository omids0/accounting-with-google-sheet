import { describe, expect, it } from 'vitest'

import { convertTgjuPrices, getSummableTgjuPrices, type TgjuPriceTable } from './tgjuCurrency'
import { computeHoldings } from './treasury'
import type { VaultTransaction } from '../types'

const toman: TgjuPriceTable = {
  sekeb: 80_000_000,
  sekee: 85_000_000,
  nim: 45_000_000,
  rob: 25_000_000,
  gerami: 10_000_000,
  geram18: 7_000_000,
  usd: 100_000
}

describe('convertTgjuPrices', () => {
  it('keeps toman as-is', () => {
    expect(convertTgjuPrices(toman, 'toman')).toEqual({ prices: toman, currency: 'toman' })
  })

  it('multiplies by 10 for rial', () => {
    const { prices, currency } = convertTgjuPrices(toman, 'rial')

    expect(currency).toBe('rial')
    expect(prices.sekeb).toBe(800_000_000)
    expect(prices.usd).toBe(1_000_000)
  })

  it('converts to USD with the tgju dollar price', () => {
    const { prices, currency } = convertTgjuPrices(toman, 'usd')

    expect(currency).toBe('usd')
    expect(prices.usd).toBe(1)
    expect(prices.geram18).toBe(70)
  })

  it('converts to EUR with the tgju euro price', () => {
    const { prices, currency } = convertTgjuPrices(toman, 'eur', 110_000)

    expect(currency).toBe('eur')
    expect(prices.sekeb).toBeCloseTo(80_000_000 / 110_000, 6)
  })

  it('falls back to labelled toman when the foreign rate is missing', () => {
    expect(convertTgjuPrices(toman, 'eur', 0)).toEqual({ prices: toman, currency: 'toman' })
    expect(convertTgjuPrices({ ...toman, usd: Number.NaN }, 'usd').currency).toBe('toman')
  })

  it('turns NaN or negative quotes into 0 instead of NaN', () => {
    const { prices } = convertTgjuPrices({ ...toman, nim: Number.NaN, rob: -5 }, 'rial')

    expect(prices.nim).toBe(0)
    expect(prices.rob).toBe(0)
  })
})

describe('getSummableTgjuPrices', () => {
  it('returns null when prices cannot be expressed in the display currency', () => {
    expect(getSummableTgjuPrices(null, 'toman')).toBeNull()
    expect(getSummableTgjuPrices({ ...toman, usd: 0 }, 'usd')).toBeNull()
    expect(getSummableTgjuPrices(toman, 'rial')?.sekeb).toBe(800_000_000)
  })
})

describe('computeHoldings', () => {
  it('values a holding at 0 rather than NaN when its price is not numeric', () => {
    const tx: VaultTransaction = {
      id: '1',
      createdAt: '',
      assetType: 'nim',
      action: 'buy',
      quantity: 2,
      unitPrice: 1,
      transactionDate: '1403/01/01',
      note: ''
    }

    const [holding] = computeHoldings([tx], { ...toman, nim: Number.NaN })

    expect(holding.totalValue).toBe(0)
    expect(holding.currentUnitPrice).toBe(0)
  })
})
