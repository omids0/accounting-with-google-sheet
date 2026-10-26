import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({ writes: [] as string[], reads: [] as string[] }))

vi.mock('./sheets', () => ({
  appendRecord: vi.fn(async (_id: string, form: { sheetName: string }) => {
    io.writes.push(`record:${form.sheetName}`)
  }),
  appendSheetRow: vi.fn(async (_id: string, sheet: string) => {
    io.writes.push(`append:${sheet}`)
  }),
  updateSheetRow: vi.fn(async (_id: string, sheet: string) => {
    io.writes.push(`update:${sheet}`)
  }),
  deleteSheetRow: vi.fn(async (_id: string, sheet: string) => {
    io.writes.push(`delete:${sheet}`)
  }),
  ensureSheetWithHeaders: vi.fn(async (_id: string, sheet: string) => {
    io.writes.push(`ensure:${sheet}`)
  }),
  fetchSheetRows: vi.fn(async (_id: string, sheet: string) => {
    io.reads.push(sheet)

    return []
  }),
  fetchSheetRangeFromApi: vi.fn(async () => [])
}))
vi.mock('./entryWallet', () => ({ settleEntryWallet: vi.fn(async () => undefined) }))
vi.mock('./activityLog', () => ({ logItemActivity: vi.fn() }))
vi.mock('./openingBalanceRefresh', () => ({ refreshOpeningBalancesInBackground: vi.fn() }))

import { postReminderItems, runAutoPost } from './recurringPost'
import {
  deleteRecurringItem,
  importRecurringCsv,
  saveRecurringItem,
  SHARED_NO_RECURRING_MESSAGE
} from './recurringSheet'
import { RECURRING_SHEET } from './sheetNames'
import { setWorkspaceType } from './workspace'
import type { AppSettings, RecurringItem } from '../types'

const ITEM: RecurringItem = {
  id: 'r1',
  createdAt: 't',
  type: 'expense',
  category: 'اجاره',
  subCategory: '',
  accountId: '',
  amount: 1000,
  title: 'اجاره',
  dayOfMonth: 1,
  mode: 'reminder',
  lastPosted: '',
  active: true
}

const settingsOf = (spreadsheetId: string) =>
  ({
    spreadsheetId,
    forms: [{ id: 'f1', type: 'expense', sheetName: 'هزینه', fields: [] }]
  } as unknown as AppSettings)

beforeEach(() => {
  localStorage.clear()
  io.writes = []
  io.reads = []
})

describe('no recurring posts in a shared account (spec non-goals)', () => {
  it('auto-post returns at once, without reading or writing', async () => {
    setWorkspaceType('SH1', 'shared')

    expect(await runAutoPost(settingsOf('SH1'), '2026-10-25')).toEqual([])
    expect(io.reads).toEqual([])
    expect(io.writes).toEqual([])
  })

  it('the reminder card posts nothing', async () => {
    setWorkspaceType('SH2', 'shared')

    expect(await postReminderItems(settingsOf('SH2'), [ITEM], new Set(['r1']), '2026-10-25')).toBe(
      0
    )
    expect(io.writes).toEqual([])
  })

  it('refuses the recurring writers themselves', async () => {
    setWorkspaceType('SH3', 'shared')

    await expect(saveRecurringItem('SH3', ITEM)).rejects.toThrow(SHARED_NO_RECURRING_MESSAGE)
    await expect(deleteRecurringItem('SH3', 'r1')).rejects.toThrow(SHARED_NO_RECURRING_MESSAGE)
    await expect(importRecurringCsv('SH3', 'a,b')).rejects.toThrow(SHARED_NO_RECURRING_MESSAGE)
    expect(io.writes).toEqual([])
  })
})

describe('personal and building recurring stay as they were', () => {
  it.each([
    ['personal', 'PR1'],
    ['building', 'BR1']
  ] as const)('%s: the reminder card writes the item and its record', async (type, id) => {
    if (type === 'building') setWorkspaceType(id, 'building')

    expect(await postReminderItems(settingsOf(id), [ITEM], new Set(['r1']), '2026-10-25')).toBe(1)
    expect(io.writes).toEqual([
      `ensure:${RECURRING_SHEET}`,
      `append:${RECURRING_SHEET}`,
      'record:هزینه'
    ])
  })

  it.each([
    ['personal', 'PR2'],
    ['building', 'BR2']
  ] as const)('%s: auto-post reads the recurring tab', async (type, id) => {
    if (type === 'building') setWorkspaceType(id, 'building')

    expect(await runAutoPost(settingsOf(id), '2026-10-25')).toEqual([])
    expect(io.reads).toContain(RECURRING_SHEET)
  })
})
