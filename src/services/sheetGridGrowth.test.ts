import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

const { fetchGridInfo, withGridGrowth } = await import('./sheetGrid')
const { SheetsApiError } = await import('./sheetsApi')

const METADATA = {
  sheets: [
    {
      properties: {
        sheetId: 3,
        title: 'هزینه',
        gridProperties: { rowCount: 60, columnCount: 9, frozenRowCount: 1 }
      }
    }
  ]
}

describe('fetchGridInfo', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('reads every tab grid in one metadata request', async () => {
    apiRequest.mockResolvedValue(METADATA)

    const grids = await fetchGridInfo('sid')

    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(decodeURIComponent(apiRequest.mock.calls[0][0])).toContain('gridProperties')
    expect(grids.get('هزینه')).toEqual({
      sheetId: 3,
      title: 'هزینه',
      rowCount: 60,
      columnCount: 9,
      frozenRowCount: 1
    })
  })
})

describe('withGridGrowth', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('sends nothing extra when the write fits', async () => {
    const write = vi.fn().mockResolvedValue('ok')

    await expect(withGridGrowth('sid', 'هزینه', 200, 12, write)).resolves.toBe('ok')
    expect(write).toHaveBeenCalledTimes(1)
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('grows rows and columns once on «exceeds grid limits» and retries', async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(
        new SheetsApiError(
          "Range ('هزینه'!A2:L200) exceeds grid limits. Max rows: 60, max columns: 9",
          400
        )
      )
      .mockResolvedValueOnce('ok')

    apiRequest.mockImplementation(async (url: string) =>
      url.includes(':batchUpdate') ? {} : METADATA
    )

    await expect(withGridGrowth('sid', 'هزینه', 200, 12, write)).resolves.toBe('ok')

    const batch = apiRequest.mock.calls.find(([url]) => String(url).includes(':batchUpdate'))!

    expect(JSON.parse(batch[1].body).requests).toEqual([
      { appendDimension: { sheetId: 3, dimension: 'ROWS', length: 140 } },
      { appendDimension: { sheetId: 3, dimension: 'COLUMNS', length: 3 } }
    ])
    expect(write).toHaveBeenCalledTimes(2)
  })

  it('rethrows other errors without touching the grid', async () => {
    const write = vi.fn().mockRejectedValue(new SheetsApiError('quota', 429))

    await expect(withGridGrowth('sid', 'هزینه', 200, 12, write)).rejects.toThrow('quota')
    expect(apiRequest).not.toHaveBeenCalled()
  })
})
