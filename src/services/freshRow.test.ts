import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsRowsModule from './sheetsRows'

const mocks = vi.hoisted(() => ({ fetchRange: vi.fn() }))

vi.mock('./sheetsRows', async importOriginal => ({
  ...(await importOriginal<typeof SheetsRowsModule>()),
  fetchSheetRangeFromApi: mocks.fetchRange
}))

const { refreshRowFromSheet } = await import('./freshRow')
const { clearStore, getSheetRow, setSheetAllRows } = await import('./spreadsheetStore')
const { addOutboxEntry } = await import('./syncOutbox')

const SHEET_ID = 'fresh-row'
const TAB = 'دنگ'
const HEADER = ['شناسه', 'عنوان']

/** What the sheet holds, by row number (index 0 = row 1). */
let remote: string[][] = []

function answer(suffix?: string): string[][] {
  if (suffix === 'A:A') return remote.map(row => [row[0] ?? ''])

  const n = Number(suffix?.split(':')[0])

  return remote[n - 1] ? [remote[n - 1]] : []
}

describe('refreshRowFromSheet', () => {
  beforeEach(() => {
    localStorage.clear()
    clearStore(SHEET_ID)
    mocks.fetchRange.mockReset()
    mocks.fetchRange.mockImplementation(async (_id: string, _tab: string, suffix?: string) =>
      answer(suffix)
    )
    remote = [HEADER, ['a', 'sheet a'], ['b', 'sheet b']]
    setSheetAllRows(SHEET_ID, TAB, [HEADER, ['a', 'old a'], ['b', 'old b']])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads just the one row and puts it in the local mirror', async () => {
    await expect(refreshRowFromSheet(SHEET_ID, TAB, 'b')).resolves.toBe('fresh')

    expect(mocks.fetchRange).toHaveBeenCalledTimes(1)
    expect(mocks.fetchRange).toHaveBeenCalledWith(SHEET_ID, TAB, '3:3')
    expect(getSheetRow(SHEET_ID, TAB, 3)).toEqual(['b', 'sheet b'])
    // The neighbours are not touched.
    expect(getSheetRow(SHEET_ID, TAB, 2)).toEqual(['a', 'old a'])
  })

  it('finds the row by id when rows moved on the sheet', async () => {
    remote = [HEADER, ['x', 'new row above'], ['a', 'sheet a'], ['b', 'sheet b']]

    await expect(refreshRowFromSheet(SHEET_ID, TAB, 'b')).resolves.toBe('fresh')

    expect(mocks.fetchRange.mock.calls.map(call => call[2])).toEqual(['3:3', 'A:A', '4:4'])
    expect(getSheetRow(SHEET_ID, TAB, 3)).toEqual(['b', 'sheet b'])
  })

  it('reports a row that is gone from the sheet', async () => {
    remote = [HEADER, ['a', 'sheet a']]

    await expect(refreshRowFromSheet(SHEET_ID, TAB, 'b')).resolves.toBe('missing')
    expect(getSheetRow(SHEET_ID, TAB, 3)).toEqual(['b', 'old b'])
  })

  it('keeps the local copy when the id is on the sheet twice', async () => {
    remote = [HEADER, ['b', 'one'], ['x', 'x'], ['b', 'two']]

    await expect(refreshRowFromSheet(SHEET_ID, TAB, 'b')).resolves.toBe('skipped')
    expect(getSheetRow(SHEET_ID, TAB, 3)).toEqual(['b', 'old b'])
  })

  it('keeps the local copy when the read fails', async () => {
    mocks.fetchRange.mockRejectedValue(new Error('network'))

    await expect(refreshRowFromSheet(SHEET_ID, TAB, 'b')).resolves.toBe('skipped')
    expect(getSheetRow(SHEET_ID, TAB, 3)).toEqual(['b', 'old b'])
  })

  it('does not read while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    await expect(refreshRowFromSheet(SHEET_ID, TAB, 'b')).resolves.toBe('skipped')
    expect(mocks.fetchRange).not.toHaveBeenCalled()
  })

  it('does not read while a write to the tab is still queued (the mirror is ahead)', async () => {
    addOutboxEntry(SHEET_ID, { type: 'update', sheetName: TAB, rowNumber: 3, row: ['b', 'mine'] })

    await expect(refreshRowFromSheet(SHEET_ID, TAB, 'b')).resolves.toBe('skipped')
    expect(mocks.fetchRange).not.toHaveBeenCalled()
  })

  it('does not read for a row the mirror does not have', async () => {
    await expect(refreshRowFromSheet(SHEET_ID, TAB, 'zzz')).resolves.toBe('skipped')
    expect(mocks.fetchRange).not.toHaveBeenCalled()
  })

  it('gives up on a slow read instead of holding the payment', async () => {
    vi.useFakeTimers()
    mocks.fetchRange.mockImplementation(() => new Promise(() => undefined))
    try {
      const pending = refreshRowFromSheet(SHEET_ID, TAB, 'b')

      await vi.advanceTimersByTimeAsync(9000)
      await expect(pending).resolves.toBe('skipped')
    } finally {
      vi.useRealTimers()
    }
  })
})
