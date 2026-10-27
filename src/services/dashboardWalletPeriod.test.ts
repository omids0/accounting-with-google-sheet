import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { invalidateDashboardCache, loadDashboardData } from './dashboard'
import { getDefaultNetAvailableConfig } from './settings'
import { appendRecord } from './sheets'
import { clearStore } from './spreadsheetStore'
import { seedDashboardSheets, TEST_SPREADSHEET_ID, testSettings } from '../test/dashboardFixtures'
import { getDateRange, getInstallmentDueRange, type DateRange } from '../utils/dateRange'

vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))

/** 5 Aban 1405; «ماه گذشته» is Mehr 1405 (2026-09-23 .. 2026-10-22). */
const TODAY = new Date('2026-10-27T12:00:00')

const WALLET_NOW = 100_000

async function seedRecords(): Promise<void> {
  const income = testSettings.forms.find(form => form.type === 'income')
  const expense = testSettings.forms.find(form => form.type === 'expense')

  if (!income || !expense) throw new Error('forms missing')

  const add = (form: typeof income, id: string, date: string, amount: number) =>
    appendRecord(TEST_SPREADSHEET_ID, form, id, '2026-01-01', {
      date,
      title: id,
      category: 'x',
      amount,
      note: ''
    })

  await add(income, 'i1', '2026-10-10', 1_000)
  await add(income, 'i2', '2026-10-15', 2_000)
  await add(income, 'i3', '2026-10-24', 5_000)
  await add(expense, 'e1', '2026-08-01', 100)
  await add(expense, 'e2', '2026-10-25', 300)
}

async function load(range: DateRange, installmentRange: DateRange = range) {
  invalidateDashboardCache(TEST_SPREADSHEET_ID)

  return loadDashboardData(
    testSettings,
    range,
    installmentRange,
    undefined,
    getDefaultNetAvailableConfig()
  )
}

describe('dashboard wallet at the end of the selected period', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    localStorage.clear()
    clearStore(TEST_SPREADSHEET_ID)
    invalidateDashboardCache(TEST_SPREADSHEET_ID)
    seedDashboardSheets(TEST_SPREADSHEET_ID, WALLET_NOW)
    await seedRecords()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses today for the current month', async () => {
    const data = await load(getDateRange('month-to-date'), getInstallmentDueRange('month-to-date'))

    expect(data.financial.walletTotal).toBe(WALLET_NOW)
    expect(data.financial.walletTotalNow).toBe(WALLET_NOW)
    expect(data.financial.walletAsOf).toBeUndefined()
    expect(data.financial.netAvailable).toBe(WALLET_NOW)
  })

  it('uses the wallet at the end of last month and says which day', async () => {
    const range = getDateRange('last-month')

    expect(range.end).toBe('2026-10-22')

    const { financial, reconciliationDiff, periodBalance } = await load(range)

    expect(financial.walletTotal).toBe(95_300)
    expect(financial.walletAsOf).toBe('2026-10-22')
    expect(financial.totalAssets).toBe(95_300)
    expect(financial.netAvailable).toBe(95_300 - financial.totalLiabilities)
    // The gap check keeps comparing today's wallet with the period balance.
    expect(financial.walletTotalNow).toBe(WALLET_NOW)
    expect(reconciliationDiff).toBe(WALLET_NOW - periodBalance)
  })

  it('works for a custom past range that ends mid-month', async () => {
    const { financial } = await load({ start: '2026-06-21', end: '2026-10-10' })

    expect(financial.walletTotal).toBe(93_300)
    expect(financial.walletAsOf).toBe('2026-10-10')
  })

  it('works for a range before the opening-balance anchor', async () => {
    const { financial } = await load({ start: '2024-01-01', end: '2024-02-01' })

    expect(financial.walletTotal).toBe(92_400)
    expect(financial.walletAsOf).toBe('2024-02-01')
  })

  it('falls back to today when the period end cannot be read', async () => {
    const { financial } = await load({ start: '2026-10-01', end: '' })

    expect(financial.walletTotal).toBe(WALLET_NOW)
    expect(financial.walletAsOf).toBeUndefined()
  })
})
