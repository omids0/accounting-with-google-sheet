import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SheetsApiModule from './sheetsApi'

const apiRequest = vi.fn()
const getSheetTitles = vi.fn()

vi.mock('./sheetsApi', async importOriginal => ({
  ...(await importOriginal<typeof SheetsApiModule>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args)
}))

vi.mock('./sheetsEnsure', () => ({
  getSheetTitles: (...args: unknown[]) => getSheetTitles(...args)
}))

const { batchFetchSheetRangesFromApi } = await import('./sheetsRows')
const { SheetsApiError } = await import('./sheetsApi')

function rangesOf(url: string): string[] {
  return [...new URL(url).searchParams.getAll('ranges')]
}

describe('batchFetchSheetRangesFromApi', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    getSheetTitles.mockReset()
  })

  it('still downloads the other sheets when one tab does not exist', async () => {
    // Google rejects the whole batch for a single unknown tab.
    apiRequest.mockImplementation(async (url: string) => {
      const ranges = rangesOf(url)

      if (ranges.some(range => range.includes('قالب_پیامک'))) {
        throw new SheetsApiError('Unable to parse range: قالب_پیامک!A:Z', 400)
      }

      return {
        valueRanges: ranges.map(range => ({ range, values: [['h'], [range.replace(/'/g, '')]] }))
      }
    })
    getSheetTitles.mockResolvedValue(['درآمد', 'هزینه'])

    const result = await batchFetchSheetRangesFromApi('sheet-id', ['درآمد', 'قالب_پیامک', 'هزینه'])

    expect([...result.keys()]).toEqual(['درآمد', 'هزینه'])
    expect(result.get('هزینه')).toEqual([['h'], ['هزینه']])
    expect(getSheetTitles).toHaveBeenCalledWith('sheet-id', true)
    expect(rangesOf(apiRequest.mock.calls[0][0])).toEqual(["'درآمد'", "'قالب_پیامک'", "'هزینه'"])
  })

  it('rethrows errors that are not about a missing tab', async () => {
    apiRequest.mockRejectedValue(new SheetsApiError('quota', 429))

    await expect(batchFetchSheetRangesFromApi('sheet-id', ['درآمد'])).rejects.toThrow('quota')
    expect(getSheetTitles).not.toHaveBeenCalled()
  })
})

describe('missingSheetNames', () => {
  it('lists requested tabs the download did not return', async () => {
    const { missingSheetNames } = await import('./sheetsMeta')

    expect(missingSheetNames(['درآمد', 'قالب_پیامک', 'هزینه'], ['هزینه', 'درآمد'])).toEqual([
      'قالب_پیامک'
    ])
  })
})
