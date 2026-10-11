import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'
import { fakeSheets, type FakeTab } from './recordArchiveSweep.fake'
import type * as SheetsApiModule from './sheetsApi'

const fake = vi.hoisted(() => ({
  api: null as null | ((url: string, init?: RequestInit) => unknown),
  read: null as null | ((name: string, suffix?: string) => string[][])
}))

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (url: string, init?: RequestInit) => fake.api!(url, init)
}))
vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async (_id: string, name: string, suffix?: string) =>
    fake.read!(name, suffix)
}))
vi.mock('./sheetRevisions', () => ({ stampSheetRevisions: async () => undefined }))

const sheets = fakeSheets()

fake.api = sheets.api
fake.read = sheets.read

const { sweepFormArchives, sweepArchivesAfterPull } = await import('./recordArchiveSweep')
const { ARCHIVE_THRESHOLD_ROWS } = await import('./recordArchive')
const { getSheetAllRows, initStore, setSheetAllRows } = await import('./spreadsheetStore')
const { addOutboxEntry } = await import('./syncOutbox')

const ID = 'sheet-1'
const BASE = 'هزینه'
const ARCHIVE = 'هزینه 1402'

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

function seed(rows: string[][], extra: Record<string, Partial<FakeTab>> = {}) {
  sheets.reset({ [BASE]: { rows: [HEADER, ...rows] }, ...extra })
  initStore(ID)
}

const ids = (name: string) => sheets.ids(name)

describe('sweepFormArchives', () => {
  beforeEach(() => localStorage.clear())

  it('copies past-year rows on the server side, then deletes them in one range', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)])

    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(true)

    expect(ids(ARCHIVE)).toEqual(['oldA', 'oldB'])
    expect(sheets.tab(ARCHIVE).marked).toBe(true)
    expect(ids(BASE)).toHaveLength(ARCHIVE_THRESHOLD_ROWS)
    expect(sheets.requests('copyPaste')).toHaveLength(1)
    expect(sheets.requests('deleteDimension')).toEqual([
      { range: { sheetId: 1, dimension: 'ROWS', startIndex: 1, endIndex: 3 } }
    ])
    expect(getSheetAllRows(ID, ARCHIVE)?.length).toBe(3)
  })

  it('does nothing at or under the threshold', async () => {
    seed([OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS - 1)])

    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(false)
    expect(sheets.has(ARCHIVE)).toBe(false)
  })

  it('does not copy a row twice when re-run after a crash', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)], {
      [ARCHIVE]: { rows: [HEADER, OLD_A], marked: true }
    })

    await sweepFormArchives(ID, EXPENSE, 1404)

    expect(ids(ARCHIVE)).toEqual(['oldA', 'oldB'])
  })

  it('deletes nothing when the archive copy cannot be confirmed', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)])
    sheets.hooks.dropCopy = true

    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(false)
    expect(sheets.requests('deleteDimension')).toEqual([])
    expect(ids(BASE)).toContain('oldA')
  })

  it('keeps a row that was edited after it was copied', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)])
    sheets.hooks.afterCopy = () => {
      sheets.tab(BASE).rows[2] = ['oldB', 't', '2023-06-02', '999']
    }

    await sweepFormArchives(ID, EXPENSE, 1404)

    expect(sheets.tab(BASE).rows.find(row => row[0] === 'oldB')?.[3]).toBe('999')
    expect(ids(BASE)).not.toContain('oldA')
  })

  it('never deletes a current-year row that shares an id with a moved one', async () => {
    seed([OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS), ['oldA', 't', '2025-07-01', '7']])

    await sweepFormArchives(ID, EXPENSE, 1404)

    expect(sheets.tab(BASE).rows.filter(row => row[0] === 'oldA')).toEqual([
      ['oldA', 't', '2025-07-01', '7']
    ])
  })

  it('leaves alone a tab with the archive name that this app did not create', async () => {
    seed([OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS)], {
      [ARCHIVE]: { rows: [HEADER, ['mine', 'x', 'y', 'z']] }
    })

    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(false)
    expect(ids(ARCHIVE)).toEqual(['mine'])
    expect(ids(BASE)).toContain('oldA')
  })

  it('skips an archive whose header differs, and extends an older prefix', async () => {
    seed([OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS)], {
      [ARCHIVE]: { rows: [['شناسه', 'چیز دیگر']], marked: true }
    })
    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(false)

    seed([OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS)], {
      [ARCHIVE]: { rows: [HEADER.slice(0, 2)], marked: true }
    })
    expect(await sweepFormArchives(ID, EXPENSE, 1404)).toBe(true)
    expect(sheets.tab(ARCHIVE).rows[0]).toEqual(HEADER)
  })

  it('removes rows another device copied at the same time', async () => {
    seed([OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS)])
    sheets.hooks.afterCopy = () => {
      sheets.tab(ARCHIVE).rows.push([...OLD_A])
    }

    await sweepFormArchives(ID, EXPENSE, 1404)

    expect(ids(ARCHIVE)).toEqual(['oldA'])
  })

  it('puts back a row another device shifted into the delete range', async () => {
    seed([OLD_A, OLD_B, ...current(ARCHIVE_THRESHOLD_ROWS)])
    sheets.hooks.beforeDelete = () => {
      sheets.tab(BASE).rows.splice(1, 1)
    }

    await sweepFormArchives(ID, EXPENSE, 1404)

    expect(ids(BASE)).toContain('c0')
    expect(new Set(ids(BASE)).size).toBe(ids(BASE).length)
  })
})

describe('sweepArchivesAfterPull', () => {
  beforeEach(() => localStorage.clear())

  it('makes no request while every form tab is under the threshold', async () => {
    seed([OLD_A, ...current(10)])
    setSheetAllRows(ID, BASE, [HEADER, OLD_A, ...current(10)])

    await sweepArchivesAfterPull(ID, [EXPENSE])

    expect(sheets.calls).toBe(0)
  })

  it('waits while writes are queued', async () => {
    const rows = [OLD_A, ...current(ARCHIVE_THRESHOLD_ROWS)]

    seed(rows)
    setSheetAllRows(ID, BASE, [HEADER, ...rows])
    addOutboxEntry(ID, { type: 'append', sheetName: 'x', row: ['1'] })

    await sweepArchivesAfterPull(ID, [EXPENSE])
    expect(sheets.has(ARCHIVE)).toBe(false)

    localStorage.clear()
    await sweepArchivesAfterPull(ID, [EXPENSE])
    expect(ids(ARCHIVE)).toEqual(['oldA'])
  })
})
