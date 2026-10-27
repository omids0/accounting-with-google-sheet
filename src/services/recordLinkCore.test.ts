import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn(), queueOutboxWrite: vi.fn() }))

const { rowsMentioning } = await import('./recordLinkCore')
const { appendSheetDataRow, clearStore, setSheetAllRows, updateSheetDataRow } = await import(
  './spreadsheetStore'
)

const SID = 'row-mentions'
const TAB = 'T'

const payments = (...ids: string[]) =>
  JSON.stringify(ids.map((id, index) => ({ id: `p${index}`, transactionRecordId: id })))

describe('rowsMentioning', () => {
  beforeEach(() => {
    clearStore(SID)
    setSheetAllRows(SID, TAB, [
      ['id', 'payments', 'note'],
      ['a', payments('rec-1', 'rec-2'), ''],
      ['b', '[]', 'rec-1'],
      ['c', payments('rec-10'), 'free text'],
      ['d', '', '']
    ])
  })

  it('finds the rows with the id in any cell (plain or inside the payments JSON), numbered as sheet rows', () => {
    expect(rowsMentioning(SID, TAB, 'rec-1').map(hit => [hit.rowNumber, hit.row[0]])).toEqual([
      [2, 'a'],
      [3, 'b']
    ])
    expect(rowsMentioning(SID, TAB, 'rec-2').map(hit => hit.rowNumber)).toEqual([2])
  })

  it('matches the whole id, not a longer id that starts with it', () => {
    expect(rowsMentioning(SID, TAB, 'rec-10').map(hit => hit.rowNumber)).toEqual([4])
    expect(rowsMentioning(SID, TAB, 'rec-')).toEqual([])
  })

  it('never reports the header row, an empty id, or a tab that is not in the mirror', () => {
    expect(rowsMentioning(SID, TAB, 'payments')).toEqual([])
    expect(rowsMentioning(SID, TAB, '')).toEqual([])
    expect(rowsMentioning(SID, 'other', 'rec-1')).toEqual([])
  })

  it('returns copies: changing a hit does not change the mirror', () => {
    rowsMentioning(SID, TAB, 'rec-1')[0].row[0] = 'changed'
    expect(rowsMentioning(SID, TAB, 'rec-1')[0].row[0]).toBe('a')
  })

  it('an id with other characters is still found (scan fallback)', () => {
    setSheetAllRows(SID, TAB, [['id'], ['x y.z']])
    expect(rowsMentioning(SID, TAB, 'x y.z').map(hit => hit.rowNumber)).toEqual([2])
  })

  it('sees every later write to the tab (the index is per version of the tab)', () => {
    expect(rowsMentioning(SID, TAB, 'rec-new')).toEqual([])
    appendSheetDataRow(SID, TAB, ['e', payments('rec-new'), ''])
    expect(rowsMentioning(SID, TAB, 'rec-new').map(hit => hit.rowNumber)).toEqual([6])
    updateSheetDataRow(SID, TAB, 6, ['e', '[]', ''])
    expect(rowsMentioning(SID, TAB, 'rec-new')).toEqual([])
  })
})
