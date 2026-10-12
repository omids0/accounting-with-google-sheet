import { afterEach, describe, expect, it } from 'vitest'

import {
  BUILTIN_VAULT_ASSETS,
  isManualPriceStale,
  mergeVaultCatalog,
  missingBuiltinAssets,
  newManualAsset,
  normalizeAssetId,
  normalizeDecimals,
  resolveVaultAsset,
  rowToVaultAsset,
  setVaultCatalog,
  vaultAssetToRow,
  vaultTgjuKeys
} from './treasuryCatalog'
import { computeHoldings, countHoldingsByClass, totalsByClass } from './treasuryHoldings'
import {
  formatQuantityValue,
  quantityError,
  quantityFitsDecimals,
  sanitizeQuantityText
} from './treasuryQuantity'
import type { VaultAction, VaultAsset, VaultTransaction } from '../types'

function tx(assetType: string, quantity: number, action: VaultAction = 'buy'): VaultTransaction {
  return {
    id: `${assetType}-${action}-${quantity}`,
    createdAt: '',
    assetType,
    action,
    quantity,
    unitPrice: 1,
    transactionDate: '2026-10-01',
    note: ''
  }
}

const steel: VaultAsset = {
  ...newManualAsset(
    { assetClass: 'stock', name: 'فولاد', symbol: 'فولاد', unit: 'سهم', decimals: 0, price: 5_000 },
    '2026-10-04'
  ),
  id: 'steel'
}

const tether: VaultAsset = {
  ...newManualAsset(
    {
      assetClass: 'crypto',
      name: 'تتر',
      symbol: 'USDT',
      unit: 'USDT',
      decimals: 8,
      price: 105_000
    },
    '2026-10-04'
  ),
  id: 'tether'
}

afterEach(() => setVaultCatalog(null))

describe('catalog seeding', () => {
  it('seeds the seven legacy assets and every tgju currency, all priced by tgju', () => {
    const ids = BUILTIN_VAULT_ASSETS.map(asset => asset.id)

    expect(ids.slice(0, 7)).toEqual(['sekeb', 'sekee', 'nim', 'rob', 'gerami', 'geram18', 'usd'])
    expect(ids).toContain('eur')
    expect(ids).toContain('jpy')
    // Rial and toman have no tgju key; the dollar is seeded once.
    expect(ids).not.toContain('irr')
    expect(ids).not.toContain('toman')
    expect(ids.filter(id => id === 'usd')).toHaveLength(1)
    expect(BUILTIN_VAULT_ASSETS.every(asset => asset.priceSource === 'tgju' && asset.tgjuKey)).toBe(
      true
    )
  })

  it('writes only the built-in rows the sheet is missing', () => {
    expect(missingBuiltinAssets([])).toHaveLength(BUILTIN_VAULT_ASSETS.length)

    const sheet = BUILTIN_VAULT_ASSETS.slice(0, 7)

    expect(missingBuiltinAssets(sheet).map(asset => asset.id)).not.toContain('sekeb')
    expect(missingBuiltinAssets(BUILTIN_VAULT_ASSETS)).toEqual([])
  })

  it('round-trips a row and lets sheet edits override the built-in', () => {
    const renamed = rowToVaultAsset(['sekee', '', '', 'سکه تمام', '', '', '', '', '', '', 'خیر'])!

    expect(renamed).toMatchObject({
      assetClass: 'gold',
      name: 'سکه تمام',
      unit: 'عدد',
      decimals: 0,
      priceSource: 'tgju',
      tgjuKey: 'sekee',
      active: false
    })
    expect(rowToVaultAsset(vaultAssetToRow(steel))).toEqual(steel)

    const catalog = mergeVaultCatalog([steel, renamed])

    expect(catalog.find(asset => asset.id === 'sekee')?.name).toBe('سکه تمام')
    expect(catalog.at(-1)).toEqual(steel)
    expect(catalog).toHaveLength(BUILTIN_VAULT_ASSETS.length + 1)
  })
})

describe('legacy id mapping', () => {
  it('maps the old «نوع دارایی» values to the seeded rows without migration', () => {
    expect(normalizeAssetId('sekeb')).toBe('sekeb')
    expect(normalizeAssetId(' GERAM18 ')).toBe('geram18')
    expect(normalizeAssetId('سکه امامی')).toBe('sekee')
    expect(normalizeAssetId('steel')).toBe('steel')
    expect(resolveVaultAsset('USD')).toMatchObject({ id: 'usd', assetClass: 'currency' })
  })

  it('keeps an unknown id visible as a manual «سایر» asset', () => {
    expect(resolveVaultAsset('mystery')).toMatchObject({
      id: 'mystery',
      name: 'mystery',
      assetClass: 'other',
      priceSource: 'manual'
    })
  })

  it('prices user-added tgju rows too', () => {
    const custom = { ...tether, id: 'btc', priceSource: 'tgju' as const, tgjuKey: 'btc-key' }

    expect(vaultTgjuKeys(mergeVaultCatalog([custom]))).toMatchObject({
      sekeb: 'sekeb',
      usd: 'price_dollar_rl',
      btc: 'btc-key'
    })
    expect(vaultTgjuKeys(mergeVaultCatalog([steel]))).not.toHaveProperty('steel')
  })
})

describe('class counts and totals', () => {
  const catalog = mergeVaultCatalog([steel, tether])
  const prices = { sekeb: 80_000_000, geram18: 7_000_000, usd: 100_000, eur: 110_000 }
  const holdings = computeHoldings(
    [
      tx('sekeb', 2),
      tx('geram18', 2.5),
      tx('usd', 200),
      tx('eur', 50),
      tx('eur', 50, 'sell'),
      tx('steel', 1_200),
      tx('tether', 150)
    ],
    prices,
    catalog
  )

  it('counts holdings with a net quantity above zero per class', () => {
    expect(countHoldingsByClass(holdings)).toEqual({
      all: 5,
      gold: 2,
      currency: 1,
      stock: 1,
      crypto: 1,
      other: 0
    })
  })

  it('sums each class, manual prices included, in chip order', () => {
    const totals = totalsByClass(holdings).map(({ assetClass, total }) => [assetClass, total])

    expect(totals).toEqual([
      ['gold', 2 * 80_000_000 + 2.5 * 7_000_000],
      ['currency', 200 * 100_000],
      ['stock', 1_200 * 5_000],
      ['crypto', 150 * 105_000]
    ])
    expect(holdings.map(holding => holding.assetType)).toEqual([
      'sekeb',
      'geram18',
      'usd',
      'steel',
      'tether'
    ])
  })
})

describe('manual price staleness', () => {
  it('flags a manual price older than 30 days or never set', () => {
    expect(isManualPriceStale(steel, '2026-11-03')).toBe(false)
    expect(isManualPriceStale(steel, '2026-11-04')).toBe(true)
    expect(isManualPriceStale({ ...steel, manualPrice: 0 }, '2026-10-05')).toBe(true)
    expect(isManualPriceStale(BUILTIN_VAULT_ASSETS[0], '2030-01-01')).toBe(false)
  })
})

describe('decimals', () => {
  it('keeps catalog decimals a whole number from 0 to 8', () => {
    expect(normalizeDecimals('3')).toBe(3)
    expect(normalizeDecimals('12')).toBe(8)
    expect(normalizeDecimals(-1)).toBe(0)
    expect(normalizeDecimals('1.5', 2)).toBe(2)
    expect(normalizeDecimals('', 0)).toBe(0)
  })

  it('caps typed fraction digits at the asset decimals', () => {
    expect(sanitizeQuantityText('۱۲.۳۴۵', 2)).toBe('12.34')
    expect(sanitizeQuantityText('7.9', 0)).toBe('7')
    expect(sanitizeQuantityText('0.123456789', 8)).toBe('0.12345678')
    expect(sanitizeQuantityText('2٫', 2)).toBe('2.')
  })

  it('rejects a quantity with more decimals than the asset allows', () => {
    expect(quantityFitsDecimals(0.12345678, 8)).toBe(true)
    expect(quantityFitsDecimals(2.5, 0)).toBe(false)
    expect(quantityError(2.5, 0)).toBe('مقدار باید عدد صحیح باشد')
    expect(quantityError(1.234, 2)).toContain('اعشار')
    expect(quantityError(1.23, 2)).toBeNull()
    expect(quantityError(0, 2)).toBe('مقدار را وارد کنید')
    expect(formatQuantityValue(1.5, 0)).toBe('۲')
  })
})
