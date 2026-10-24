import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'

const FIELDS: CustomForm['fields'] = [
  { id: 'date', label: 'تاریخ', type: 'date', required: true },
  { id: 'title', label: 'عنوان', type: 'text', required: false },
  { id: 'amount', label: 'مبلغ', type: 'number', required: true },
  { id: 'category', label: 'دسته‌بندی', type: 'select', required: true },
  { id: 'note', label: 'توضیحات', type: 'text', required: false },
  { id: 'subCategory', label: 'زیردسته', type: 'select', required: false },
  { id: 'walletAccount', label: 'حساب', type: 'select', required: false },
  { id: 'walletApply', label: 'اثر بر موجودی', type: 'select', required: false },
  { id: 'counterparty', label: 'طرف حساب', type: 'select', required: false },
  { id: 'lineItems', label: 'اقلام', type: 'text', required: false }
]

const EXPENSE: CustomForm = {
  id: 'form_expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: FIELDS
}

/** The sheet itself, apart from the app's local copy. */
const remote = vi.hoisted(() => ({ rows: [] as string[][], requests: [] as { body: string }[] }))

vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async () => remote.rows.map(row => [...row])
}))
vi.mock('./sheetsApi', () => ({
  SHEETS_API: 'https://sheets.test',
  apiRequest: async (_url: string, init: { body: string }) => {
    remote.requests.push(init)

    const { data } = JSON.parse(init.body) as {
      data: { range: string; values: (string | number)[][] }[]
    }

    for (const part of data) {
      const row = Number(/!A(\d+):/.exec(decodeURIComponent(part.range))?.[1])

      remote.rows[row - 1] = part.values[0].map(String)
    }

    return {}
  }
}))
vi.mock('./sheetSyncAnnounce', () => ({
  readDriveTime: async () => null,
  announceWrites: async () => undefined
}))
vi.mock('./sheetSyncOutbox', () => ({
  withOutboxLock: (_id: string, task: () => Promise<unknown>) => task()
}))
vi.mock('./settings', () => ({ getSettings: () => ({ forms: [EXPENSE] }) }))

const { buildHeaders } = await import('./sheetsHeaders')
const { findLegacyRows, repairLegacyRows, legacyRepairBlocker } = await import('./legacyRowRepair')
const { initStore, setSheetAllRows, getSheetAllRows } = await import('./spreadsheetStore')
const { addOutboxEntry, clearOutbox } = await import('./syncOutbox')

const ID = 'repair-sheet'

const HEADER = [...buildHeaders(FIELDS), 'ثبت‌کننده']

const LEGACY = ['L1', 't1', '2026-08-23', 'Cursor', '2000000', 'AI', 'note', 'Cursor']

const LEGACY_WITH_WRITER = [
  'L2',
  't2',
  '2026-10-15',
  'روغن',
  '5100000',
  'خودرو',
  '',
  'روغن موتور',
  '',
  'بله',
  '',
  'me@example.com'
]

const CURRENT = [
  'C1',
  't3',
  '2026-10-21',
  'QA',
  'سایر',
  '',
  '12345',
  '',
  'بله',
  '',
  '',
  '',
  'x@y.com'
]

describe('repairing legacy-layout rows', () => {
  beforeEach(() => {
    remote.requests = []
    clearOutbox(ID)
    initStore(ID)
    remote.rows = [HEADER, CURRENT, LEGACY, LEGACY_WITH_WRITER]
    setSheetAllRows(ID, 'هزینه', [HEADER, CURRENT, LEGACY, LEGACY_WITH_WRITER])
  })

  it('finds only the legacy rows, with their sheet row numbers', () => {
    const fixes = findLegacyRows(ID, [EXPENSE])

    expect(fixes.map(fix => [fix.sheetName, fix.rowNumber])).toEqual([
      ['هزینه', 3],
      ['هزینه', 4]
    ])
    expect(fixes[0].after.slice(0, 7)).toEqual([
      'L1',
      't1',
      '2026-08-23',
      'Cursor',
      'AI',
      'Cursor',
      '2000000'
    ])
    expect(fixes[0].after[11]).toBe('note')
    expect(fixes[1].after[12]).toBe('me@example.com')
    expect(fixes[1].after[11]).toBe('')
  })

  it('writes the rows in one request, in the sheet and the local copy, keeping the others', async () => {
    const fixes = findLegacyRows(ID, [EXPENSE])

    await expect(repairLegacyRows(ID, fixes)).resolves.toEqual({
      written: 2,
      skipped: 0,
      aborted: false
    })

    expect(remote.requests).toHaveLength(1)
    expect(remote.rows[1]).toEqual(CURRENT)
    expect(remote.rows[2].slice(0, 7)).toEqual(fixes[0].after.slice(0, 7))
    expect(remote.rows[2][0]).toBe('L1')
    expect(remote.rows[2][1]).toBe('t1')
    expect(getSheetAllRows(ID, 'هزینه')?.[1]).toEqual(CURRENT)
    expect(getSheetAllRows(ID, 'هزینه')?.[2]).toEqual(fixes[0].after)
  })

  it('is idempotent: a second scan finds nothing and a second run writes nothing', async () => {
    await repairLegacyRows(ID, findLegacyRows(ID, [EXPENSE]))
    remote.requests = []

    const again = findLegacyRows(ID, [EXPENSE])

    expect(again).toEqual([])
    await expect(repairLegacyRows(ID, again)).resolves.toEqual({
      written: 0,
      skipped: 0,
      aborted: false
    })
    expect(remote.requests).toHaveLength(0)
  })

  it('writes nothing when the sheet gained or lost a row since the scan', async () => {
    const fixes = findLegacyRows(ID, [EXPENSE])

    remote.rows = [...remote.rows, ['N1', 't', '2026-10-01', 'x']]

    await expect(repairLegacyRows(ID, fixes)).resolves.toMatchObject({ aborted: true, written: 0 })
    expect(remote.requests).toHaveLength(0)
  })

  it('writes nothing when an id moved to another row', async () => {
    const fixes = findLegacyRows(ID, [EXPENSE])

    remote.rows = [HEADER, LEGACY, CURRENT, LEGACY_WITH_WRITER]

    await expect(repairLegacyRows(ID, fixes)).resolves.toMatchObject({ aborted: true })
    expect(remote.requests).toHaveLength(0)
  })

  it('skips a row someone edited meanwhile and repairs the rest', async () => {
    const fixes = findLegacyRows(ID, [EXPENSE])

    remote.rows[2] = [...LEGACY.slice(0, 4), '2500000', ...LEGACY.slice(5)]

    await expect(repairLegacyRows(ID, fixes)).resolves.toEqual({
      written: 1,
      skipped: 1,
      aborted: false
    })
    expect(remote.rows[2][4]).toBe('2500000')
    expect(remote.rows[3][12]).toBe('me@example.com')
  })

  it('sends 273 rows in at most ceil(273 / 100) requests', async () => {
    const legacy = Array.from({ length: 273 }, (_, i) => [
      `id${i}`,
      `t${i}`,
      '2026-08-23',
      `عنوان ${i}`,
      String(1000 + i),
      'AI'
    ])

    remote.rows = [HEADER, ...legacy]
    setSheetAllRows(ID, 'هزینه', [HEADER, ...legacy])

    const fixes = findLegacyRows(ID, [EXPENSE])

    expect(fixes).toHaveLength(273)
    await expect(repairLegacyRows(ID, fixes)).resolves.toMatchObject({ written: 273 })
    expect(remote.requests.length).toBeLessThanOrEqual(Math.ceil(273 / 100))
    expect(remote.rows[273].slice(0, 7)).toEqual([
      'id272',
      't272',
      '2026-08-23',
      'عنوان 272',
      'AI',
      '',
      '1272'
    ])
    expect(findLegacyRows(ID, [EXPENSE])).toEqual([])
  })

  it('ignores tabs without a header row and forms that are not income/expense', () => {
    setSheetAllRows(ID, 'هزینه', [LEGACY, LEGACY_WITH_WRITER])

    expect(findLegacyRows(ID, [EXPENSE])).toEqual([])
    expect(findLegacyRows(ID, [{ ...EXPENSE, type: 'custom' } as unknown as CustomForm])).toEqual(
      []
    )
  })

  it('refuses to start while edits are still queued', () => {
    expect(legacyRepairBlocker(ID)).toBeNull()
    addOutboxEntry(ID, { type: 'append', sheetName: 'هزینه', row: ['x'] })
    expect(legacyRepairBlocker(ID)).toContain('صف')
  })
})
