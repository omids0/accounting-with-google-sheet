import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const TAB = 'موجودی ماهانه'

const HEADER = ['ماه', 'مبلغ', 'زمان', 'یادداشت']

const NOTE = 'محاسبه خودکار از مانده پایان ماه قبل'

/** The sheet itself: Google keeps 15 significant digits, whatever the app wrote. */
const remote = vi.hoisted(() => ({ rows: [] as string[][], puts: 0 }))

function to15Digits(cell: unknown): string {
  const text = String(cell ?? '')

  return /^-?\d+\.\d+$/.test(text) ? String(Number(Number(text).toPrecision(15))) : text
}

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: async (url: string, init?: { method?: string; body?: string }) => {
    const decoded = decodeURIComponent(url)

    if (init?.method === 'PUT' && decoded.includes('/values/')) {
      const row = Number(/!A(\d+):/.exec(decoded)?.[1])

      remote.puts += 1
      remote.rows[row - 1] = (JSON.parse(init.body ?? '{}').values[0] as unknown[]).map(to15Digits)

      return {}
    }
    if (!init?.method && decoded.includes('/values/')) {
      return { values: remote.rows.map(row => [...row]) }
    }

    return {}
  }
}))
vi.mock('./sheetsEnsure', () => ({
  ensureSheetWithHeaders: async () => undefined,
  ensureManySheetsWithHeaders: async () => undefined,
  getSheetId: async () => 1,
  getSheetTitles: async () => [TAB]
}))
vi.mock('./periodSettings', () => ({}))
vi.mock('./sheetSyncAnnounce', () => ({
  readDriveTime: async () => null,
  announceWrites: async () => undefined
}))
vi.mock('./settings', () => ({ getSettings: () => ({ forms: [] }) }))

const { syncDerivedOpeningBalances } = await import('./openingBalanceService')
const { flushOutbox } = await import('./sheetSyncOutbox')
const { initStore, setSheetAllRows, getSheetAllRows } = await import('./spreadsheetStore')
const { getFailedOutboxEntries, getOutboxEntries, clearOutbox } = await import('./syncOutbox')

const ID = 'mirror-sheet'

function seed(rows: string[][]) {
  clearOutbox(ID)
  localStorage.clear()
  initStore(ID)
  remote.puts = 0
  // The app's copy still holds the noisy string it once wrote; the sheet holds the 15-digit one.
  setSheetAllRows(ID, TAB, [HEADER, ...rows])
  remote.rows = [HEADER, ...rows.map(row => row.map(to15Digits))]
}

function context(openings: [string, number][]) {
  return {
    anchorMonthKey: '1405-01',
    anchorAmount: 0,
    openings: new Map(openings),
    monthlyNet: new Map(),
    startDate: '2026-03-21'
  }
}

/** One dashboard/wallet load: derive, mirror, let the outbox send. */
async function load(openings: [string, number][]) {
  await syncDerivedOpeningBalances(ID, context(openings))
  await flushOutbox(ID)
}

describe('the derived opening-balance mirror', () => {
  beforeEach(() => {
    seed([
      ['1405-07', '41373496', '۱۴۰۵/۸/۲, ۸:۵۸:۲۵', NOTE],
      ['1405-08', '52305378.29999998', '۱۴۰۵/۸/۲, ۸:۵۸:۲۵', NOTE]
    ])
  })

  it('five loads with an unchanged value write nothing, whatever the float noise', async () => {
    for (let i = 0; i < 5; i += 1)
      await load([
        ['1405-07', 41373496],
        ['1405-08', 52305378.3]
      ])

    expect(remote.puts).toBe(0)
    expect(getOutboxEntries(ID)).toHaveLength(0)
    expect(getFailedOutboxEntries(ID)).toHaveLength(0)
  })

  it('five loads with one real change send one write and fail none', async () => {
    for (let i = 0; i < 5; i += 1)
      await load([
        ['1405-07', 41373496],
        ['1405-08', 52305400.1]
      ])

    expect(remote.puts).toBe(1)
    expect(remote.rows[2][1]).toBe('52305400.1')
    expect(getOutboxEntries(ID)).toHaveLength(0)
    expect(getFailedOutboxEntries(ID)).toHaveLength(0)
  })

  it('while a write is still waiting, later loads add nothing', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    try {
      for (let i = 0; i < 5; i += 1)
        await load([
          ['1405-07', 41373496],
          ['1405-08', 52305400.1]
        ])

      expect(getOutboxEntries(ID)).toHaveLength(1)
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    }
    await flushOutbox(ID)
    expect(remote.puts).toBe(1)
    expect(getFailedOutboxEntries(ID)).toHaveLength(0)
  })

  it('a month listed twice is updated in its last row only', async () => {
    seed([
      ['1405-07', '55911291', '۱۴۰۵/۷/۱, ۹:۰۰:۰۰', NOTE],
      ['1405-07', '41373496', '۱۴۰۵/۸/۲, ۸:۵۸:۲۵', NOTE]
    ])

    await load([['1405-07', 41373500]])

    expect(remote.puts).toBe(1)
    expect(remote.rows[1][1]).toBe('55911291')
    expect(remote.rows[2][1]).toBe('41373500')
    expect(getSheetAllRows(ID, TAB)?.[1][1]).toBe('55911291')
    expect(getFailedOutboxEntries(ID)).toHaveLength(0)
  })
})
