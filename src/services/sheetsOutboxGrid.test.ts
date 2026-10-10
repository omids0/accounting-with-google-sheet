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
    ).resolves.toBeUndefined()
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
