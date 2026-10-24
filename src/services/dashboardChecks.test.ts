import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CHECK_DIRECTION_LABELS } from './checkDirection'
import { CHECKS_HEADERS, CHECKS_SHEET } from './checks'
import { invalidateDashboardCache, loadDashboardData } from './dashboard'
import { getDefaultNetAvailableConfig } from './settings'
import { clearStore, setSheetAllRows } from './spreadsheetStore'
import { seedDashboardSheets, TEST_SPREADSHEET_ID, testSettings } from '../test/dashboardFixtures'
import { getDateRange, getInstallmentDueRange } from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'

vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn()
}))

const today = getTodayIso()

/** A checks row as the sheet keeps it; `type` undefined leaves the last cell out, like an old row. */
function row(id: string, amount: number, type?: 'paid' | 'received', paid = false): string[] {
  const cells = [id, '', id, 'علی', String(amount), today, today, paid ? 'بله' : 'خیر']

  cells.push('', '', '', '', '')

  return type ? [...cells, CHECK_DIRECTION_LABELS[type]] : cells.slice(0, 11)
}

async function load(config = getDefaultNetAvailableConfig()) {
  invalidateDashboardCache(TEST_SPREADSHEET_ID)

  return (
    await loadDashboardData(
      testSettings,
      getDateRange('month-to-date'),
      getInstallmentDueRange('month-to-date'),
      undefined,
      config
    )
  ).financial
}

describe('dashboard with checks of both types', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(TEST_SPREADSHEET_ID)
    seedDashboardSheets(TEST_SPREADSHEET_ID, 1_000)
    setSheetAllRows(TEST_SPREADSHEET_ID, CHECKS_SHEET, [
      CHECKS_HEADERS,
      row('old', 100),
      row('p', 200, 'paid'),
      row('r', 50, 'received'),
      row('done', 700, 'received', true)
    ])
  })

  it('counts payable checks as debt (old rows too) and received ones as an asset', async () => {
    const financial = await load()

    expect(financial.checksDue).toBe(300)
    expect(financial.checksReceivable).toBe(50)
    expect(financial.totalAssets).toBe(1_050)
    expect(financial.totalLiabilities).toBe(300)
    expect(financial.netAvailable).toBe(750)
  })

  it('drops received checks from the assets when their switch is off', async () => {
    const config = getDefaultNetAvailableConfig()
    const financial = await load({ ...config, assets: { ...config.assets, checksReceived: false } })

    expect(financial.totalAssets).toBe(1_000)
    expect(financial.netAvailable).toBe(700)
  })
})
