import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))
vi.mock('./spreadsheetStore', () => ({
  getSheetAllRows: () => [['شناسه', 'مبلغ']],
  setSheetAllRows: vi.fn()
}))

const { appendHeaderColumn } = await import('./migrateSubCategoryColumn')
const { SheetsApiError } = await import('./sheetsApi')

describe('appendHeaderColumn on a trimmed grid', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('adds a grid column when the new header passes the edge', async () => {
    let rejected = false

    apiRequest.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (init?.method === 'PUT' && !rejected) {
        rejected = true
        throw new SheetsApiError('exceeds grid limits. Max rows: 2, max columns: 2', 400)
      }
      if (url.includes('?fields=')) {
        return {
          sheets: [
            {
              properties: {
                sheetId: 4,
                title: 'هزینه',
                gridProperties: { rowCount: 2, columnCount: 2 }
              }
            }
          ]
        }
      }

      return {}
    })

    await appendHeaderColumn('sid', 'هزینه', 'زیردسته')

    const grow = apiRequest.mock.calls.find(([url]) => String(url).includes(':batchUpdate'))!

    expect(JSON.parse(grow[1].body).requests).toEqual([
      { appendDimension: { sheetId: 4, dimension: 'COLUMNS', length: 1 } }
    ])
  })
})
