import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'

/** A fake spreadsheet: tab name → rows (header first). */
const tabs = new Map<string, string[][]>()

const hooks = vi.hoisted(() => ({
  dropAppends: false,
  /** Runs right before a batchUpdate is applied (simulates another device). */
  beforeDelete: null as null | (() => void),
  stamp: vi.fn(),
  batchUpdates: [] as unknown[][]
}))

const BASE = 'هزینه'

function tabFromUrl(url: string): string {
  const encoded = url.split('/values/')[1].split(':')[0]

  return decodeURIComponent(encoded).replace(/^'|'$/g, '')
}

vi.mock('./sheetsApi', () => ({
  SHEETS_API: 'https://sheets.test/v4/spreadsheets',
  SheetsApiError: class extends Error {},
  apiRequest: async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body)

    if (url.includes(':append')) {
      if (!hooks.dropAppends) tabs.get(tabFromUrl(url))!.push(...body.values.map(String2D))

      return {}
    }
    hooks.beforeDelete?.()
    hooks.batchUpdates.push(body.requests)

    const rows = tabs.get(BASE)!

    const ranges = body.requests.map(
      (r: { deleteDimension: { range: { startIndex: number; endIndex: number } } }) =>
        r.deleteDimension.range
    )

    for (const { startIndex, endIndex } of ranges) rows.splice(startIndex, endIndex - startIndex)

    return {}
  }
}))

function String2D(row: unknown[]): string[] {
  return row.map(cell => String(cell))
}

vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async (_id: string, name: string) =>
    (tabs.get(name) ?? []).map(row => [...row])
}))
vi.mock('./sheetsEnsure', () => ({
  ensureSheetWithHeaders: async (_id: string, name: string, headers: string[]) => {
    if (!tabs.has(name)) tabs.set(name, [headers])
  },
  getSheetId: async () => 1
}))
vi.mock('./sheetGrid', () => ({
  withGridGrowth: (_a: string, _b: string, _c: number, _d: number, write: () => unknown) => write()
}))
vi.mock('./sheetRevisions', () => ({
  stampSheetRevisions: (...args: unknown[]) => hooks.stamp(...args)
}))

const { sweepFormArchives } = await import('./recordArchiveSweep')
const { ARCHIVE_THRESHOLD_ROWS } = await import('./recordArchive')
const { getSheetAllRows, initStore } = await import('./spreadsheetStore')

const ID = 'sheet-1'

const EXPENSE: CustomForm = {
  id: 'form_expense',
  name: BASE,
  sheetName: BASE,
  type: 'expense',
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true }
  ]
}

const HEADER = ['شناسه', 'زمان ثبت', 'تاریخ', 'مبلغ']

const OLD_A = ['oldA', 't', '2023-06-01', '1'] // 1402
const OLD_B = ['oldB', 't', '2023-06-02', '2'] // 1402

function current(count: number): string[][] {
  return Array.from({ length: count }, (_, i) => [`c${i}`, 't', '2025-06-01', '5']) // 1404
}

function seed(rows: string[][]) {
  tabs.clear()
  tabs.set(BASE, [HEADER, ...rows])
  initStore(ID)
}

function ids(name: string): string[] {
  return (tabs.get(name) ?? []).slice(1).map(row => row[0])
}

describe('sweepFormArchives', () => {
  beforeEach(() => {
    hooks.dropAppends = false
    hooks.beforeDelete = null
    hooks.stamp.mockReset().mockResolvedValue(undefined)
    hooks.batchUpdates = []
  })

  it('moves past-year rows into the archive and deletes them from the form tab in one range', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)])

    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(true)

    expect(ids('هزینه 1402')).toEqual(['oldA', 'oldB'])
    expect(ids(BASE)).not.toContain('oldA')
    expect(ids(BASE)).toHaveLength(ARCHIVE_THRESHOLD_ROWS)
    expect(hooks.batchUpdates).toEqual([
      [
        {
          deleteDimension: { range: { sheetId: 1, dimension: 'ROWS', startIndex: 1, endIndex: 3 } }
        }
      ]
    ])
    expect(hooks.stamp).toHaveBeenCalledWith(ID, [BASE, 'هزینه 1402'])
    expect(getSheetAllRows(ID, BASE)?.length).toBe(ARCHIVE_THRESHOLD_ROWS + 1)
    expect(getSheetAllRows(ID, 'هزینه 1402')?.length).toBe(3)
  })

  it('does nothing at or under the threshold', async () => {
    seed([OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS - 1)])

    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(false)
    expect(tabs.has('هزینه 1402')).toBe(false)
  })

  it('does not copy a row twice when re-run after a crash', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)])
    tabs.set('هزینه 1402', [HEADER, OLD_A])

    await sweepFormArchives(ID, EXPENSE, 1404)

    expect(ids('هزینه 1402')).toEqual(['oldA', 'oldB'])
  })

  it('deletes nothing when the archive copy cannot be confirmed', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)])
    hooks.dropAppends = true

    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(false)
    expect(hooks.batchUpdates).toEqual([])
    expect(ids(BASE)).toContain('oldA')
  })

  it('puts back a row another device shifted into the delete range', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)])
    // Another device deletes oldA after our last read: row indexes shift by one,
    // so our delete of rows 2–3 now hits oldB and c0.
    hooks.beforeDelete = () => {
      tabs.get(BASE)!.splice(1, 1)
    }

    await sweepFormArchives(ID, EXPENSE, 1404)

    expect(ids(BASE)).toContain('c0')
    expect(ids(BASE)).not.toContain('oldB')
    expect(new Set(ids(BASE)).size).toBe(ids(BASE).length)
  })
})

describe('sweepArchivesAfterPull', () => {
  beforeEach(() => {
    hooks.stamp.mockReset().mockResolvedValue(undefined)
    hooks.batchUpdates = []
    localStorage.clear()
  })

  it('checks the local mirror first and calls Google only for a tab over the threshold', async () => {
    const { sweepArchivesAfterPull } = await import('./recordArchiveSweep')
    const { setSheetAllRows } = await import('./spreadsheetStore')

    seed([OLD_A, ...current(10)])
    setSheetAllRows(ID, BASE, [HEADER, OLD_A, ...current(10)])

    await sweepArchivesAfterPull(ID, [EXPENSE])

    expect(tabs.has('هزینه 1402')).toBe(false)
  })

  it('waits while writes are queued', async () => {
    const { sweepArchivesAfterPull } = await import('./recordArchiveSweep')
    const { setSheetAllRows } = await import('./spreadsheetStore')
    const { addOutboxEntry } = await import('./syncOutbox')

    const rows = [OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS)]

    seed(rows)
    setSheetAllRows(ID, BASE, [HEADER, ...rows])
    addOutboxEntry(ID, { type: 'append', sheetName: 'x', row: ['1'] })

    await sweepArchivesAfterPull(ID, [EXPENSE])
    expect(tabs.has('هزینه 1402')).toBe(false)

    localStorage.clear()
    await sweepArchivesAfterPull(ID, [EXPENSE])
    expect(ids('هزینه 1402')).toEqual(['oldA'])
  })
})
