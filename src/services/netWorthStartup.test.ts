import { beforeEach, describe, expect, it, vi } from 'vitest'

const sheet = vi.hoisted(() => ({ rows: [] as { monthKey: string }[], appended: [] as unknown[] }))

vi.mock('./netWorthSheet', () => ({
  fetchNetWorthSnapshots: vi.fn(async () => sheet.rows),
  appendNetWorthSnapshots: vi.fn(async (_id: string, rows: { monthKey: string }[]) => {
    sheet.appended.push(...rows)
    sheet.rows.push(...rows)
  }),
  netWorthTimestamp: () => 'now'
}))

vi.mock('./netWorthSources', () => ({
  loadTodayNetWorth: vi.fn(async () => ({ netWorth: 900, assets: 1000, liabilities: 100 })),
  loadNetWorthRecords: vi.fn(async () => ({})),
  loadRebuildInput: vi.fn(async () => ({
    walletTotal: 1000,
    monthlyNet: new Map([['1405-04', { income: 100, expense: 0 }]]),
    vaultTransactions: [],
    prices: null,
    goalsTotal: 0,
    receivables: [],
    installmentPlans: [],
    checks: [],
    dangs: []
  }))
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
