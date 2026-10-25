import { beforeEach, describe, expect, it, vi } from 'vitest'

const tabs: Record<string, string[][]> = {}

vi.mock('./spreadsheetStore', () => ({
  getStore: (id: string) => (id === 'sheet-1' ? { sheets: tabs } : null)
}))

const { countSheetDataRows, rowHasContent } = await import('./spreadsheetStoreCount')

const HEADER = ['شناسه', 'عنوان']

describe('rowHasContent', () => {
  it('is false for blank cells and true when any cell has text', () => {
    expect(rowHasContent([])).toBe(false)
    expect(rowHasContent(['', '  ', '\t'])).toBe(false)
    expect(rowHasContent(['', 'x'])).toBe(true)
    expect(rowHasContent([undefined, 0] as unknown as string[])).toBe(true)
  })
})

describe('countSheetDataRows', () => {
  beforeEach(() => {
    for (const key of Object.keys(tabs)) delete tabs[key]
    tabs['هزینه'] = [HEADER, ['1', 'a'], ['', ''], ['2', 'b'], ['3', 'c']]
    tabs['خالی'] = [HEADER]
    tabs['بدون هدر'] = []
  })

  it('counts the matching data rows and skips the header', () => {
    expect(countSheetDataRows('sheet-1', 'هزینه', rowHasContent)).toBe(3)
    expect(countSheetDataRows('sheet-1', 'هزینه', () => true)).toBe(4)
    expect(countSheetDataRows('sheet-1', 'خالی', () => true)).toBe(0)
    expect(countSheetDataRows('sheet-1', 'بدون هدر', () => true)).toBe(0)
  })

  it('stops at the threshold and looks no further', () => {
    const seen: string[][] = []
    const matches = (row: readonly string[]) => {
      seen.push([...row])

      return rowHasContent(row)
    }

    expect(countSheetDataRows('sheet-1', 'هزینه', matches, 1)).toBe(1)
    expect(seen).toHaveLength(1)
    expect(countSheetDataRows('sheet-1', 'هزینه', rowHasContent, 2)).toBe(2)
  })

  it('with a zero threshold only says whether the tab is cached', () => {
    const matches = vi.fn(() => true)

    expect(countSheetDataRows('sheet-1', 'هزینه', matches, 0)).toBe(0)
    expect(matches).not.toHaveBeenCalled()
    expect(countSheetDataRows('sheet-1', 'نیست', matches, 0)).toBeNull()
  })

  it('is null for an uncached tab or spreadsheet', () => {
    expect(countSheetDataRows('sheet-1', 'نیست', rowHasContent)).toBeNull()
    expect(countSheetDataRows('other', 'هزینه', rowHasContent)).toBeNull()
  })

  it('reads the cached rows in place without copying them', () => {
    const seen: (readonly string[])[] = []

    countSheetDataRows('sheet-1', 'هزینه', row => {
      seen.push(row)

      return true
    })

    expect(seen[0]).toBe(tabs['هزینه'][1])
  })
})
