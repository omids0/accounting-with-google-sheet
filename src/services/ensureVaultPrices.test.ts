import { beforeEach, describe, expect, it, vi } from 'vitest'

const tgju = vi.hoisted(() => ({
  quotes: null as Record<string, number> | null,
  offline: false,
  fetchCount: 0
}))

vi.mock('./tgju', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getCachedTgjuEurToman: () => 0,
  getCachedTgjuPrices: (keys: Record<string, string>) =>
    tgju.quotes
      ? Object.fromEntries(Object.keys(keys).map(asset => [asset, tgju.quotes?.[asset] ?? 0]))
      : null,
  fetchTgjuPrices: vi.fn(async () => {
    tgju.fetchCount += 1

    if (tgju.offline) throw new Error('offline')

    tgju.quotes = { usd: 60_000, nim: 20_000_000 }

    return tgju.quotes
  })
}))

import { ensureVaultPrices } from './tgjuCurrency'
import { setVaultCatalog, BUILTIN_VAULT_ASSETS } from './treasuryCatalog'
import { computeHoldings, isUnquoted } from './treasuryHoldings'
import type { VaultAsset, VaultTransaction } from '../types'

const tx = (assetType: string): VaultTransaction => ({
  id: assetType,
  createdAt: '',
  assetType,
  action: 'buy',
  quantity: 1,
  unitPrice: 0,
  transactionDate: '2026-05-01',
  note: ''
})

const manualCoin: VaultAsset = {
  ...BUILTIN_VAULT_ASSETS.find(asset => asset.id === 'sekee')!,
  priceSource: 'manual',
  manualPrice: 30_000_000
}

describe('ensureVaultPrices', () => {
  beforeEach(() => {
    tgju.quotes = null
    tgju.offline = false
    tgju.fetchCount = 0
    setVaultCatalog([manualCoin, ...BUILTIN_VAULT_ASSETS.filter(asset => asset.id !== 'sekee')])
  })

  it('fetches on a cold start, then reads the cache', async () => {
    const first = await ensureVaultPrices()

    expect(first?.nim).toBe(20_000_000)
    expect(await ensureVaultPrices()).toEqual(first)
    expect(tgju.fetchCount).toBe(1)
  })

  it('does not ask tgju when every asset has a manual price', async () => {
    expect(await ensureVaultPrices([tx('sekee')])).toBeNull()
    expect(tgju.fetchCount).toBe(0)
  })

  it('asks tgju when a live-priced asset is held', async () => {
    expect((await ensureVaultPrices([tx('sekee'), tx('nim')]))?.nim).toBe(20_000_000)
    expect(tgju.fetchCount).toBe(1)
  })

  it('gives null, not an error, when tgju cannot be reached', async () => {
    tgju.offline = true

    expect(await ensureVaultPrices([tx('nim')])).toBeNull()
  })
})

describe('isUnquoted (a live-priced holding with no quote is unknown, not 0)', () => {
  const holdings = (prices: Record<string, number>) =>
    computeHoldings([tx('sekee'), tx('nim')], prices, [
      manualCoin,
      ...BUILTIN_VAULT_ASSETS.filter(asset => asset.id !== 'sekee')
    ])

  it('lists every holding without prices and flags only the live-priced one', () => {
    const rows = holdings({})

    expect(rows.map(row => row.assetType)).toEqual(['sekee', 'nim'])
    expect(rows.map(isUnquoted)).toEqual([false, true])
    expect(rows[0].totalValue).toBe(30_000_000)
  })

  it('flags nothing once the quote exists', () => {
    expect(holdings({ nim: 20_000_000 }).some(isUnquoted)).toBe(false)
  })
})
