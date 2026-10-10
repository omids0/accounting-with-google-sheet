import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

const { batchAddSheetTabs, writeSheetHeaders } = await import('./sheetsEnsure')

describe('new tab grids', () => {
  beforeEach(() => {
    apiRequest.mockReset().mockResolvedValue({})
  })

  it('creates each tab exactly as wide as its headers', async () => {
    await batchAddSheetTabs('sid', [
      { sheetName: 'هزینه', headers: ['شناسه', 'زمان ثبت', 'مبلغ'] },
      { sheetName: 'آزاد', headers: [] }
    ])

    const body = JSON.parse(apiRequest.mock.calls[0][1].body)

    expect(body.requests).toEqual([
      {
        addSheet: {
          properties: {
            title: 'هزینه',
            gridProperties: { rowCount: 2, columnCount: 3, frozenRowCount: 1 }
          }
        }
      },
      { addSheet: { properties: { title: 'آزاد' } } }
    ])
  })

  it('writes headers past column Z with a valid end column', async () => {
    const headers = Array.from({ length: 28 }, (_, i) => `h${i}`)

    await writeSheetHeaders('sid', 'هزینه', headers)

    expect(decodeURIComponent(apiRequest.mock.calls[0][0])).toContain("'هزینه'!A1:AB1")
  })
})
