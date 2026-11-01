import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn(async (..._args: unknown[]): Promise<unknown> => ({}))

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

const { markActivityTrailMigrated, migrateActivityTrailColumns } = await import(
  './migrateActivityTrailColumns'
)
const { ACTIVITY_LOG_HEADERS } = await import('./sheetHeaders')
const { ACTIVITY_LOG_SHEET } = await import('./sheetNames')
const { clearStore, getSheetAllRows, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'sheet-trail-migration'

const OLD_HEADER = ACTIVITY_LOG_HEADERS.slice(0, 9)

const OLD_ROW = ['a', '2026-10-01T00:00:00Z', 'x@y', 'X', 'update', 'records', 'r1', 's', 'Android']

const methodOf = (call: unknown[]) => (call[1] as { method?: string } | undefined)?.method ?? 'GET'

const requests = (method: string) => apiRequest.mock.calls.filter(call => methodOf(call) === method)

beforeEach(() => {
  localStorage.clear()
  clearStore(SHEET_ID)
  apiRequest.mockReset()
  apiRequest.mockImplementation(async () => ({}))
})

describe('migrateActivityTrailColumns', () => {
  it('adds قبل، بعد، نسخه at the end of an older tab and keeps its rows', async () => {
    setSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET, [OLD_HEADER, OLD_ROW])

    await migrateActivityTrailColumns(SHEET_ID)

    const rows = getSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET)!

    expect(rows[0]).toEqual(ACTIVITY_LOG_HEADERS)
    expect(rows[1]).toEqual(OLD_ROW)
    expect(requests('PUT')).toHaveLength(1)
    expect(apiRequest).toHaveBeenCalledTimes(1)
  })

  it('reads the header once and writes once for an older tab that is not in the store', async () => {
    apiRequest.mockImplementation(async (...args: unknown[]) =>
      methodOf(args) === 'GET' ? { values: [OLD_HEADER, OLD_ROW] } : {}
    )

    await migrateActivityTrailColumns(SHEET_ID)

    expect(requests('GET')).toHaveLength(1)
    expect(requests('PUT')).toHaveLength(1)
    expect(JSON.parse(String((requests('PUT')[0][1] as { body: string }).body))).toEqual({
      values: [ACTIVITY_LOG_HEADERS]
    })
  })

  it('writes only the columns that are missing, after the ones already there', async () => {
    setSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET, [[...OLD_HEADER, 'بعد']])

    await migrateActivityTrailColumns(SHEET_ID)

    expect(getSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET)![0]).toEqual([
      ...OLD_HEADER,
      'بعد',
      'قبل',
      'نسخه'
    ])
    expect(requests('PUT')).toHaveLength(1)
  })

  it('does not write for a complete tab and remembers it after the single read', async () => {
    apiRequest.mockImplementation(async (...args: unknown[]) =>
      methodOf(args) === 'GET' ? { values: [ACTIVITY_LOG_HEADERS] } : {}
    )

    await migrateActivityTrailColumns(SHEET_ID)
    await migrateActivityTrailColumns(SHEET_ID)

    expect(requests('GET')).toHaveLength(1)
    expect(requests('PUT')).toHaveLength(0)
  })

  it('starts no second round of requests while the first is still running', async () => {
    apiRequest.mockImplementation(async (...args: unknown[]) => {
      await new Promise(resolve => setTimeout(resolve, 10))

      return methodOf(args) === 'GET' ? { values: [OLD_HEADER] } : {}
    })

    await Promise.all([
      migrateActivityTrailColumns(SHEET_ID),
      migrateActivityTrailColumns(SHEET_ID),
      migrateActivityTrailColumns(SHEET_ID)
    ])
    await migrateActivityTrailColumns(SHEET_ID)

    expect(requests('GET')).toHaveLength(1)
    expect(requests('PUT')).toHaveLength(1)
  })

  it('is tried again after a failure, not remembered as done', async () => {
    apiRequest.mockRejectedValueOnce(new Error('offline'))

    await expect(migrateActivityTrailColumns(SHEET_ID)).rejects.toThrow('offline')

    apiRequest.mockImplementation(async (...args: unknown[]) =>
      methodOf(args) === 'GET' ? { values: [OLD_HEADER] } : {}
    )
    await migrateActivityTrailColumns(SHEET_ID)

    expect(requests('PUT')).toHaveLength(1)
  })

  it('leaves a tab that does not exist yet alone: it is created with all twelve', async () => {
    await migrateActivityTrailColumns(SHEET_ID)

    expect(requests('PUT')).toHaveLength(0)
  })

  it('makes no request at all for a spreadsheet the app created', async () => {
    markActivityTrailMigrated(SHEET_ID)
    await migrateActivityTrailColumns(SHEET_ID)

    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('does nothing the second time, or for a tab that already has them', async () => {
    setSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET, [ACTIVITY_LOG_HEADERS])
    await migrateActivityTrailColumns(SHEET_ID)
    await migrateActivityTrailColumns(SHEET_ID)

    expect(apiRequest).not.toHaveBeenCalled()
  })
})
