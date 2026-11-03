import { beforeEach, describe, expect, it, vi } from 'vitest'

const tgju = vi.hoisted(() => ({
  /** asset id → toman price; `null` is the cold start, before anything fetched quotes. */
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

vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))

import { invalidateDashboardCache, loadDashboardData } from './dashboard'
import { getDefaultNetAvailableConfig } from './settings'
import { TREASURY_ASSETS_HEADERS } from './sheetHeaders'
import { TREASURY_ASSETS_SHEET } from './sheetNames'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import { TREASURY_HEADERS, TREASURY_SHEET } from './treasury'
import { seedDashboardSheets, TEST_SPREADSHEET_ID, testSettings } from '../test/dashboardFixtures'
import type { NetAvailableConfig } from '../types'
import { getDateRange, getInstallmentDueRange } from '../utils/dateRange'

const WALLET = 100_000

/** «سکه امامی» priced by hand in the data tab, as a user can do. */
const MANUAL_COIN = ['sekee', 'gold', '', '', '', '0', 'manual', 'sekee', '30000000', '', 'بله']

const buy = (id: string, assetType: string, quantity: number) => [
  id,
  '',
  assetType,
  'buy',
  String(quantity),
  '0',
  '2026-05-01',
  ''
]

function seedVault(transactions: string[][]): void {
  setSheetAllRows(TEST_SPREADSHEET_ID, TREASURY_ASSETS_SHEET, [
    TREASURY_ASSETS_HEADERS,
    MANUAL_COIN
  ])
  setSheetAllRows(TEST_SPREADSHEET_ID, TREASURY_SHEET, [TREASURY_HEADERS, ...transactions])
}

async function load(config: NetAvailableConfig = getDefaultNetAvailableConfig()) {
  invalidateDashboardCache(TEST_SPREADSHEET_ID)

  return loadDashboardData(
    testSettings,
    getDateRange('month-to-date'),
    getInstallmentDueRange('month-to-date'),
    undefined,
    config
  )
}

describe('dashboard vault on a cold start (no tgju quotes cached yet)', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(TEST_SPREADSHEET_ID)
    invalidateDashboardCache(TEST_SPREADSHEET_ID)
    seedDashboardSheets(TEST_SPREADSHEET_ID, WALLET)
    tgju.quotes = null
    tgju.offline = false
    tgju.fetchCount = 0
  })

  it('counts a manual-priced asset without asking tgju for anything', async () => {
    seedVault([buy('t1', 'sekee', 2)])

    const { financial } = await load()

    expect(financial.treasuryTotal).toBe(60_000_000)
    expect(financial.totalAssets).toBe(WALLET + 60_000_000)
    expect(financial.netAvailable).toBe(WALLET + 60_000_000)
    expect(financial.treasuryUnquoted).toEqual([])
    expect(tgju.fetchCount).toBe(0)
  })

  it('moves «دارایی قابل اتکا» when the treasury switch is toggled', async () => {
    seedVault([buy('t1', 'sekee', 2)])

    const base = getDefaultNetAvailableConfig()

    const on = await load({ ...base, assets: { ...base.assets, treasury: true } })
    const off = await load({ ...base, assets: { ...base.assets, treasury: false } })

    expect(on.financial.netAvailable).toBe(WALLET + 60_000_000)
    expect(off.financial.netAvailable).toBe(WALLET)
  })

  it('fetches tgju once for a live-priced asset and counts it', async () => {
    seedVault([buy('t1', 'nim', 3), buy('t2', 'sekee', 1)])

    const first = await load()

    await load()

    expect(first.financial.treasuryTotal).toBe(3 * 20_000_000 + 30_000_000)
    expect(first.financial.treasuryUnquoted).toEqual([])
    expect(tgju.fetchCount).toBe(1)
  })

  it('values a live-priced asset 0, names it, and still counts the manual ones when offline', async () => {
    tgju.offline = true
    seedVault([buy('t1', 'nim', 3), buy('t2', 'sekee', 1)])

    const { financial } = await load()

    expect(financial.treasuryTotal).toBe(30_000_000)
    expect(financial.netAvailable).toBe(WALLET + 30_000_000)
    expect(financial.treasuryUnquoted).toEqual(['نیم سکه'])
  })
})
