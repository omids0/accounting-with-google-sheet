import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn(async (..._args: unknown[]) => ({}))

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

const { migrateActivityTrailColumns } = await import('./migrateActivityTrailColumns')
const { ACTIVITY_LOG_HEADERS } = await import('./sheetHeaders')
const { ACTIVITY_LOG_SHEET } = await import('./sheetNames')
const { clearStore, getSheetAllRows, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'sheet-trail-migration'

const OLD_HEADER = ACTIVITY_LOG_HEADERS.slice(0, 9)

const OLD_ROW = ['a', '2026-10-01T00:00:00Z', 'x@y', 'X', 'update', 'records', 'r1', 's', 'Android']

beforeEach(() => {
  localStorage.clear()
  clearStore(SHEET_ID)
  apiRequest.mockClear()
})

describe('migrateActivityTrailColumns', () => {
  it('adds قبل، بعد، نسخه at the end of an older tab and keeps its rows', async () => {
    setSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET, [OLD_HEADER, OLD_ROW])

    await migrateActivityTrailColumns(SHEET_ID)

    const rows = getSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET)!

    expect(rows[0]).toEqual(ACTIVITY_LOG_HEADERS)
    expect(rows[1]).toEqual(OLD_ROW)
    expect(
      apiRequest.mock.calls.filter(([, init]) => (init as { method?: string })?.method === 'PUT')
    ).toHaveLength(3)
  })

  it('does nothing the second time, or for a tab that already has them', async () => {
    setSheetAllRows(SHEET_ID, ACTIVITY_LOG_SHEET, [ACTIVITY_LOG_HEADERS])
    await migrateActivityTrailColumns(SHEET_ID)
    await migrateActivityTrailColumns(SHEET_ID)

    expect(apiRequest).not.toHaveBeenCalled()
  })
})
