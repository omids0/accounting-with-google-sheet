import { describe, expect, it } from 'vitest'

import { planGridTrim, ROW_BUFFER, type GridInfo } from './sheetGrid'

function grid(overrides: Partial<GridInfo> = {}): GridInfo {
  return {
    sheetId: 7,
    title: 'هزینه',
    rowCount: 1000,
    columnCount: 26,
    frozenRowCount: 1,
    frozenColumnCount: 0,
    ...overrides
  }
}

function range(dimension: 'ROWS' | 'COLUMNS', startIndex: number, endIndex: number) {
  return { deleteDimension: { range: { sheetId: 7, dimension, startIndex, endIndex } } }
}

describe('planGridTrim', () => {
  it('cuts a default 1000×26 grid down to the schema width plus a row buffer', () => {
    expect(planGridTrim({ grid: grid(), minWidth: 9, lastDataRow: 10, lastDataColumn: 9 })).toEqual(
      [range('COLUMNS', 9, 26), range('ROWS', 10 + ROW_BUFFER, 1000)]
    )
  })

  it('keeps a data column that lies past the schema width', () => {
    expect(
      planGridTrim({ grid: grid(), minWidth: 9, lastDataRow: 10, lastDataColumn: 12 })[0]
    ).toEqual(range('COLUMNS', 12, 26))
  })

  it('returns nothing for a grid that is already trimmed', () => {
    const trimmed = grid({ rowCount: 10 + ROW_BUFFER, columnCount: 9 })

    expect(
      planGridTrim({ grid: trimmed, minWidth: 9, lastDataRow: 10, lastDataColumn: 9 })
    ).toEqual([])
  })

  it('leaves rows alone while the surplus is within twice the buffer', () => {
    const small = grid({ rowCount: 10 + ROW_BUFFER * 2, columnCount: 9 })

    expect(planGridTrim({ grid: small, minWidth: 9, lastDataRow: 10, lastDataColumn: 9 })).toEqual(
      []
    )
  })

  it('keeps one unfrozen column past frozen columns', () => {
    expect(
      planGridTrim({
        grid: grid({ frozenColumnCount: 5 }),
        minWidth: 3,
        lastDataRow: 1,
        lastDataColumn: 3
      })[0]
    ).toEqual(range('COLUMNS', 6, 26))
  })

  it('never cuts an empty tab below one unfrozen row or one column', () => {
    expect(
      planGridTrim({
        grid: grid({ frozenRowCount: 1 }),
        minWidth: 0,
        lastDataRow: 0,
        lastDataColumn: 0
      })
    ).toEqual([range('COLUMNS', 1, 26), range('ROWS', ROW_BUFFER, 1000)])
    expect(
      planGridTrim({
        grid: grid({ frozenRowCount: 80 }),
        minWidth: 3,
        lastDataRow: 1,
        lastDataColumn: 3
      })[1]
    ).toEqual(range('ROWS', 81, 1000))
  })
})
