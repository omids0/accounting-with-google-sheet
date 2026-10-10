import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()
const getSheetAllRows = vi.fn()
const hasPendingOutbox = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))
vi.mock('./spreadsheetStore', () => ({
  getSheetAllRows: (...args: unknown[]) => getSheetAllRows(...args)
}))
vi.mock('./syncOutbox', () => ({
  hasPendingOutbox: (...args: unknown[]) => hasPendingOutbox(...args)
}))
vi.mock('./spreadsheetSetup', () => ({
  getAllSheetSpecs: () => [
    { sheetName: 'هزینه', headers: ['شناسه', 'زمان ثبت', 'مبلغ'] },
    { sheetName: 'فعالیت', headers: ['کلید', 'مقدار'] }
  ]
}))

const { migrateCompactGrids, sheetExtent } = await import('./migrateCompactGrids')

function gridOf(sheetId: number, title: string, frozenRowCount?: number) {
  return {
    properties: {
      sheetId,
      title,
      gridProperties: { rowCount: 1000, columnCount: 26, frozenRowCount }
    }
  }
}

const GRIDS = {
  sheets: [gridOf(1, 'هزینه', 1), gridOf(2, 'فعالیت'), gridOf(9, 'شیت شخصی من')]
}

function respond(probeValues: Record<string, unknown[][]>) {
  apiRequest.mockImplementation(async (url: string) => {
    if (url.includes('values:batchGet')) {
      const ranges = new URL(url).searchParams.getAll('ranges')

      return { valueRanges: ranges.map(range => ({ range, values: probeValues[range] ?? [] })) }
    }
    if (url.includes(':batchUpdate')) return {}

    return GRIDS
  })
}

type SentRequest = { deleteDimension: { range: { sheetId: number } } }

function sentRequests(): SentRequest[] | null {
  const call = apiRequest.mock.calls.find(([url]) => String(url).includes(':batchUpdate'))

  return call ? JSON.parse(call[1].body).requests : null
}

function trim(sheetId: number, dimension: string, startIndex: number) {
  return {
    deleteDimension: {
      range: { sheetId, dimension, startIndex, endIndex: dimension === 'ROWS' ? 1000 : 26 }
    }
  }
}

describe('migrateCompactGrids', () => {
  beforeEach(() => {
    localStorage.clear()
    apiRequest.mockReset()
    hasPendingOutbox.mockReset().mockReturnValue(false)
    getSheetAllRows.mockReset().mockImplementation((_id: string, name: string) =>
      name === 'هزینه'
        ? [
            ['شناسه', 'زمان ثبت', 'مبلغ'],
            ['1', 't', '500']
          ]
        : null
    )
  })

  it('trims app tabs in one batchUpdate and never touches user tabs', async () => {
    respond({
      "'فعالیت'": [
        ['کلید', 'مقدار'],
        ['last', 'x']
      ]
    })

    await migrateCompactGrids('sid')

    expect(sentRequests()).toEqual([
      trim(1, 'COLUMNS', 3),
      trim(1, 'ROWS', 52),
      trim(2, 'COLUMNS', 2),
      trim(2, 'ROWS', 52)
    ])
  })

  it('probes columns past the data width and skips a tab that has data there', async () => {
    respond({ "'هزینه'!D:Z": [[], ['', '', 'دستی']] })

    await migrateCompactGrids('sid')

    const batchGet = apiRequest.mock.calls.find(([url]) => String(url).includes('values:batchGet'))!

    expect(new URL(batchGet[0]).searchParams.getAll('ranges')).toContain("'هزینه'!D:Z")
    expect((sentRequests() ?? []).some(r => r.deleteDimension.range.sheetId === 1)).toBe(false)
  })

  it('does nothing while writes are queued and runs only once when it succeeds', async () => {
    respond({})
    hasPendingOutbox.mockReturnValue(true)
    await migrateCompactGrids('sid')
    expect(apiRequest).not.toHaveBeenCalled()

    hasPendingOutbox.mockReturnValue(false)
    await migrateCompactGrids('sid')
    const callsAfterFirstRun = apiRequest.mock.calls.length

    expect(callsAfterFirstRun).toBeGreaterThan(0)
    await migrateCompactGrids('sid')
    expect(apiRequest.mock.calls.length).toBe(callsAfterFirstRun)
  })

  it('leaves the flag unset when the batchUpdate fails', async () => {
    respond({})
    const answer = apiRequest.getMockImplementation()!

    apiRequest.mockImplementation(async (url: string, init?: unknown) => {
      if (url.includes(':batchUpdate')) throw new Error('boom')

      return answer(url, init)
    })

    await expect(migrateCompactGrids('sid')).rejects.toThrow('boom')
    apiRequest.mockClear()
    respond({})
    await migrateCompactGrids('sid')
    expect(sentRequests()).not.toBeNull()
  })
})

describe('sheetExtent', () => {
  it('finds the last row and column holding a value', () => {
    expect(sheetExtent([['a', 'b'], [], ['', '', 'c'], ['  ']])).toEqual({
      lastDataRow: 3,
      lastDataColumn: 3
    })
    expect(sheetExtent([])).toEqual({ lastDataRow: 0, lastDataColumn: 0 })
  })
})
