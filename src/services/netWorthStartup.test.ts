import { beforeEach, describe, expect, it, vi } from 'vitest'

const sheet = vi.hoisted(() => ({ rows: [] as { monthKey: string }[], appended: [] as unknown[] }))
const rebuild = vi.hoisted(() => ({
  monthlyNet: new Map<string, { income: number; expense: number }>(),
  fails: false,
  vaultTransactions: [] as unknown[],
  catalog: undefined as unknown[] | undefined,
  unquotedToday: [] as string[]
}))

vi.mock('./netWorthSheet', () => ({
  fetchNetWorthSnapshots: vi.fn(async () => sheet.rows),
  appendNetWorthSnapshots: vi.fn(async (_id: string, rows: { monthKey: string }[]) => {
    sheet.appended.push(...rows)
    sheet.rows.push(...rows)
  }),
  netWorthTimestamp: () => 'now'
}))

vi.mock('./netWorthSources', () => ({
  loadTodayNetWorth: vi.fn(async () => ({
    netWorth: 900,
    assets: 1000,
    liabilities: 100,
    vaultUnquoted: rebuild.unquotedToday
  })),
  loadNetWorthRecords: vi.fn(async () => ({})),
  loadRebuildInput: vi.fn(async () => {
    if (rebuild.fails) throw new Error('unreadable')

    return {
      walletTotal: 1000,
      monthlyNet: rebuild.monthlyNet,
      vaultTransactions: rebuild.vaultTransactions,
      prices: null,
      catalog: rebuild.catalog,
      goalsTotal: 0,
      receivables: [],
      installmentPlans: [],
      checks: [],
      dangs: []
    }
  })
}))

vi.mock('./settings', () => ({
  getSettings: () => ({ spreadsheetId: 'S1' }),
  getNetAvailableConfig: () => ({
    assets: { wallet: true, treasury: true, goals: true, receivables: true },
    liabilities: { installments: true, dangs: true, checks: true }
  })
}))

vi.mock('./syncStatus', () => ({
  getSyncStatus: () => ({ lastSyncedAt: Date.now() + 60_000, syncState: 'idle' }),
  subscribeSyncStatus: () => () => undefined
}))

vi.mock('../utils/jalaliDate', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getTodayIso: () => '2026-10-13'
}))

import { readNetWorthGate, runNetWorthSnapshot } from './netWorthStartup'
import { setWorkspaceType } from './workspace'

describe('runNetWorthSnapshot', () => {
  beforeEach(() => {
    localStorage.clear()
    sheet.rows = []
    sheet.appended = []
    rebuild.monthlyNet = new Map([['1405-04', { income: 100, expense: 0 }]])
    rebuild.fails = false
    rebuild.vaultTransactions = []
    rebuild.unquotedToday = []
  })

  it('writes last month once, rebuilds the earlier months once, then stays quiet', async () => {
    await runNetWorthSnapshot('S1')

    // 2026-10-13 is 21 Mehr 1405: Shahrivar gets the auto row, Tir–Mordad are rebuilt.
    expect(sheet.appended).toEqual([
      expect.objectContaining({ monthKey: '1405-04', source: 'rebuilt' }),
      expect.objectContaining({ monthKey: '1405-05', source: 'rebuilt' }),
      {
        monthKey: '1405-06',
        netWorth: 900,
        assets: 1000,
        liabilities: 100,
        recordedAt: 'now',
        source: 'auto'
      }
    ])
    expect(readNetWorthGate('S1')).toEqual({
      checkedMonth: '1405-07',
      rebuiltAt: expect.any(String)
    })

    sheet.appended = []
    await runNetWorthSnapshot('S1')
    expect(sheet.appended).toEqual([])
  })

  it('skips a month that already has a row', async () => {
    sheet.rows = [{ monthKey: '1405-06' }]
    localStorage.setItem(
      'accounting_net_worth_v1',
      JSON.stringify({ S1: { checkedMonth: '1405-06', rebuiltAt: 'x' } })
    )

    await runNetWorthSnapshot('S1')

    expect(sheet.appended).toEqual([])
    expect(readNetWorthGate('S1').checkedMonth).toBe('1405-07')
  })
})

describe('the previous month auto row when the app is first opened late', () => {
  // 21 Mehr 1405: the month just ended is Shahrivar (1405-06).
  const gateOpenedBefore = () =>
    localStorage.setItem(
      'accounting_net_worth_v1',
      JSON.stringify({ S1: { checkedMonth: '1405-05', rebuiltAt: 'x' } })
    )
  const autoRow = () =>
    sheet.appended.find(row => (row as { monthKey: string }).monthKey === '1405-06') as
      | { netWorth: number; assets: number; liabilities: number; source: string }
      | undefined

  beforeEach(() => {
    localStorage.clear()
    sheet.rows = []
    sheet.appended = []
    rebuild.fails = false
    gateOpenedBefore()
  })

  it('writes the month-end value, not the value of today, when records are dated after the month end', async () => {
    rebuild.monthlyNet = new Map([
      ['1405-04', { income: 100, expense: 0 }],
      ['1405-07', { income: 300, expense: 100 }]
    ])

    await runNetWorthSnapshot('S1')

    // Wallet today 1000 minus the net 200 of Mehr: 800 at the end of Shahrivar, not today's 900.
    expect(autoRow()).toEqual(
      expect.objectContaining({ netWorth: 800, assets: 800, liabilities: 0, source: 'auto' })
    )
  })

  it('writes the value of today when no record is dated after the month end', async () => {
    rebuild.monthlyNet = new Map([['1405-04', { income: 100, expense: 0 }]])

    await runNetWorthSnapshot('S1')

    expect(autoRow()).toEqual(
      expect.objectContaining({ netWorth: 900, assets: 1000, liabilities: 100, source: 'auto' })
    )
  })

  it('writes the value of today when the month is before the first record', async () => {
    rebuild.monthlyNet = new Map([['1405-07', { income: 300, expense: 100 }]])

    await runNetWorthSnapshot('S1')

    expect(autoRow()).toEqual(expect.objectContaining({ netWorth: 900, source: 'auto' }))
  })

  it('writes the value of today when the records cannot be read', async () => {
    rebuild.fails = true

    await runNetWorthSnapshot('S1')

    expect(autoRow()).toEqual(expect.objectContaining({ netWorth: 900, source: 'auto' }))
  })

  it('does not overwrite a month that already has a row', async () => {
    rebuild.monthlyNet = new Map([
      ['1405-04', { income: 100, expense: 0 }],
      ['1405-07', { income: 300, expense: 100 }]
    ])
    sheet.rows = [{ monthKey: '1405-06' }]

    await runNetWorthSnapshot('S1')

    expect(sheet.appended).toEqual([])
  })
})

describe('a vault that cannot be fully valued', () => {
  const buy = (assetType: string) => ({
    id: 'v1',
    createdAt: '',
    assetType,
    action: 'buy',
    quantity: 2,
    unitPrice: 0,
    transactionDate: '2026-05-01',
    note: ''
  })
  const gate = { S1: { checkedMonth: '1405-05', rebuiltAt: 'x' } }

  beforeEach(() => {
    localStorage.clear()
    sheet.rows = []
    sheet.appended = []
    rebuild.fails = false
    rebuild.monthlyNet = new Map([
      ['1405-04', { income: 100, expense: 0 }],
      ['1405-07', { income: 300, expense: 100 }]
    ])
    rebuild.vaultTransactions = []
    rebuild.unquotedToday = []
    localStorage.setItem('accounting_net_worth_v1', JSON.stringify(gate))
  })

  it('writes no auto row and keeps the month open when a live-priced asset has no quote', async () => {
    rebuild.vaultTransactions = [buy('nim')]

    await runNetWorthSnapshot('S1')

    expect(sheet.appended).toEqual([])
    expect(readNetWorthGate('S1')).toEqual({ checkedMonth: '1405-05', rebuiltAt: 'x' })
  })

  it('also holds back the value of today when the dashboard reports a missing quote', async () => {
    rebuild.monthlyNet = new Map([['1405-04', { income: 100, expense: 0 }]])
    rebuild.unquotedToday = ['نیم سکه']

    await runNetWorthSnapshot('S1')

    expect(sheet.appended).toEqual([])
    expect(readNetWorthGate('S1').checkedMonth).toBe('1405-05')
  })

  it('does not run the one-time rebuild either, so it can be redone once quotes exist', async () => {
    localStorage.clear()
    rebuild.vaultTransactions = [buy('nim')]

    await runNetWorthSnapshot('S1')

    expect(sheet.appended).toEqual([])
    expect(readNetWorthGate('S1').rebuiltAt).toBeUndefined()
  })

  it('writes the row when every held asset has a manual price', async () => {
    const manual = {
      id: 'manual-coin',
      assetClass: 'gold',
      symbol: 'M',
      name: 'سکه دستی',
      unit: 'عدد',
      decimals: 0,
      priceSource: 'manual',
      tgjuKey: '',
      manualPrice: 5_000,
      manualPriceAt: '',
      active: true
    }

    rebuild.vaultTransactions = [buy('manual-coin')]
    rebuild.catalog = [manual]

    await runNetWorthSnapshot('S1')

    // 800 (wallet back at Shahrivar's end) + 2 coins at 5 000.
    expect(sheet.appended).toEqual([
      expect.objectContaining({ monthKey: '1405-06', netWorth: 10_800, source: 'auto' })
    ])
    expect(readNetWorthGate('S1').checkedMonth).toBe('1405-07')
  })
})

describe('runNetWorthSnapshot outside a personal workspace', () => {
  beforeEach(() => {
    localStorage.clear()
    sheet.rows = []
    sheet.appended = []
  })

  it.each(['building', 'shared'] as const)('writes no net-worth row into a %s file', async type => {
    setWorkspaceType('S1', type)

    await runNetWorthSnapshot('S1')

    expect(sheet.appended).toEqual([])
    expect(readNetWorthGate('S1').checkedMonth).toBeUndefined()
  })
})
