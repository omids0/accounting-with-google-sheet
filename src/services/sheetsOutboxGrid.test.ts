import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

const { executeOutboxOperation } = await import('./sheetsOutboxApi')
const { SheetsApiError } = await import('./sheetsApi')

const SHEET = 'دسته‌بندی‌ها'

function rejectFirstPut() {
  let rejected = false

  apiRequest.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (init?.method === 'PUT' && !rejected) {
      rejected = true
      throw new SheetsApiError('exceeds grid limits. Max rows: 3, max columns: 3', 400)
    }
    if (url.includes('?fields=')) {
      return {
        sheets: [
          {
            properties: {
              sheetId: 5,
              title: SHEET,
              gridProperties: { rowCount: 3, columnCount: 3 }
            }
          }
        ]
      }
    }

    return {}
  })
}

function growRequests() {
  const call = apiRequest.mock.calls.find(([url]) => String(url).includes(':batchUpdate'))

  return call ? JSON.parse(call[1].body).requests : null
}

function putCount() {
  return apiRequest.mock.calls.filter(([, init]) => init?.method === 'PUT').length
}

describe('writes on a trimmed grid', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('grows the grid and retries when replaced rows pass its edge', async () => {
    rejectFirstPut()

    const rows = Array.from({ length: 4 }, (_, i) => [`id${i}`, `n${i}`, ''])

    await executeOutboxOperation('sid', { type: 'replace', sheetName: SHEET, rows, columnCount: 3 })

    expect(growRequests()).toEqual([
      { appendDimension: { sheetId: 5, dimension: 'ROWS', length: 2 } }
    ])
    expect(putCount()).toBe(2)
  })

  it('treats a clear range below the grid edge as nothing left to clear', async () => {
    apiRequest.mockImplementation(async (url: string) => {
      if (url.includes(':clear')) {
        throw new SheetsApiError('exceeds grid limits. Max rows: 3, max columns: 3', 400)
      }

      return {}
    })

    const rows = [['id1', 'n1', '']]

    await expect(
      executeOutboxOperation('sid', { type: 'replace', sheetName: SHEET, rows, columnCount: 3 })
    ).resolves.toBe(SHEET)
  })

  it('grows the columns when an appended row is wider than the grid', async () => {
    let rejected = false

    apiRequest.mockImplementation(async (url: string) => {
      if (url.includes(':append') && !rejected) {
        rejected = true
        throw new SheetsApiError('exceeds grid limits. Max rows: 3, max columns: 3', 400)
      }
      if (url.includes('?fields=')) {
        return {
          sheets: [
            {
              properties: {
                sheetId: 5,
                title: SHEET,
                gridProperties: { rowCount: 3, columnCount: 3 }
              }
            }
          ]
        }
      }

      return {}
    })

    await executeOutboxOperation('sid', {
      type: 'append',
      sheetName: SHEET,
      row: ['id', 'name', 'parent', 'extra']
    })

    expect(growRequests()).toEqual([
      { appendDimension: { sheetId: 5, dimension: 'COLUMNS', length: 1 } }
    ])
    expect(apiRequest.mock.calls.filter(([url]) => String(url).includes(':append'))).toHaveLength(2)
  })

  it('grows the columns when an updated row is wider than the grid', async () => {
    rejectFirstPut()

    await executeOutboxOperation('sid', {
      type: 'update',
      sheetName: SHEET,
      rowNumber: 2,
      row: ['id', 'name', 'parent', 'extra']
    })

    expect(growRequests()).toEqual([
      { appendDimension: { sheetId: 5, dimension: 'COLUMNS', length: 1 } }
    ])
    expect(putCount()).toBe(2)
  })
})

describe('replacing a tab whose data fills the grid exactly', () => {
  /** Google's own rule: a range may not start or end below the last row of the grid. */
  function fakeGoogle(initialRows: number) {
    let maxRows = initialRows

    apiRequest.mockImplementation(
      async (url: string, init?: { method?: string; body?: string }) => {
        const decoded = decodeURIComponent(url)

        const range = /!A(\d+):C(\d*)/.exec(decoded)

        if (range && (decoded.includes(':clear') || init?.method === 'PUT')) {
          const start = Number(range[1])
          const end = range[2] ? Number(range[2]) : start

          if (start > maxRows || end > maxRows) {
            throw new SheetsApiError(
              `Range ('${SHEET}'!A${start}:C${range[2]}) exceeds grid limits. Max rows: ${maxRows}, max columns: 3`,
              400
            )
          }
        }
        if (url.includes(':batchUpdate')) {
          for (const request of JSON.parse(init?.body ?? '{}').requests ?? []) {
            if (request.appendDimension?.dimension === 'ROWS')
              maxRows += request.appendDimension.length
          }
        }
        if (url.includes('?fields=')) {
          return {
            sheets: [
              {
                properties: {
                  sheetId: 5,
                  title: SHEET,
                  gridProperties: { rowCount: maxRows, columnCount: 3 }
                }
              }
            ]
          }
        }

        return {}
      }
    )
  }

  const rowsOf = (count: number) => Array.from({ length: count }, (_, i) => [`id${i}`, `n${i}`, ''])

  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('105 rows on a 106-row grid: the clear below the edge is nothing left to clear', async () => {
    fakeGoogle(106)

    await expect(
      executeOutboxOperation('sid', {
        type: 'replace',
        sheetName: SHEET,
        rows: rowsOf(105),
        columnCount: 3
      })
    ).resolves.toBe(SHEET)

    const clear = apiRequest.mock.calls.find(([url]) => String(url).includes(':clear'))

    expect(decodeURIComponent(String(clear?.[0]))).toContain('A107:C')
  })

  it('106 rows on a 106-row grid: the write grows the grid and the clear stays harmless', async () => {
    fakeGoogle(106)

    await expect(
      executeOutboxOperation('sid', {
        type: 'replace',
        sheetName: SHEET,
        rows: rowsOf(106),
        columnCount: 3
      })
    ).resolves.toBe(SHEET)
    expect(growRequests()).toEqual([
      { appendDimension: { sheetId: 5, dimension: 'ROWS', length: 1 } }
    ])
  })

  it('recognises the grid-edge refusal by its message, whatever the class or status', async () => {
    apiRequest.mockImplementation(async (url: string) => {
      if (url.includes(':clear')) {
        throw new Error("Range ('x'!A107:C) exceeds grid limits. Max rows: 106, max columns: 3")
      }

      return {}
    })

    await expect(
      executeOutboxOperation('sid', {
        type: 'replace',
        sheetName: SHEET,
        rows: rowsOf(105),
        columnCount: 3
      })
    ).resolves.toBe(SHEET)
  })

  it('still fails on any other 400 from the clear', async () => {
    apiRequest.mockImplementation(async (url: string) => {
      if (url.includes(':clear')) throw new SheetsApiError('Invalid value at range', 400)

      return {}
    })

    await expect(
      executeOutboxOperation('sid', {
        type: 'replace',
        sheetName: SHEET,
        rows: rowsOf(2),
        columnCount: 3
      })
    ).rejects.toThrow(/Invalid value/)
  })
})
