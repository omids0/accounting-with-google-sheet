import { describe, expect, it } from 'vitest'

import { applyWriteRows, revertWriteRows } from './failedWriteMirror'

const HEADER = ['شناسه', 'عنوان', 'مبلغ']

describe('revertWriteRows', () => {
  it('removes an appended row the sheet never got', () => {
    const rows = [HEADER, ['1', 'a', '10'], ['2', 'b', '20']]

    expect(
      revertWriteRows(rows, { type: 'append', sheetName: 's', row: ['2', 'b', '20'] })
    ).toEqual([HEADER, ['1', 'a', '10']])
  })

  it('puts the previous values back after a failed edit', () => {
    const rows = [HEADER, ['1', 'new', '10']]

    expect(
      revertWriteRows(rows, {
        type: 'update',
        sheetName: 's',
        rowNumber: 2,
        row: ['1', 'new', '10'],
        expectedRow: ['1', 'old', '10']
      })
    ).toEqual([HEADER, ['1', 'old', '10']])
  })

  it('leaves a row alone that was edited again after the failed write', () => {
    const rows = [HEADER, ['1', 'newer', '10']]

    expect(
      revertWriteRows(rows, {
        type: 'update',
        sheetName: 's',
        rowNumber: 2,
        row: ['1', 'new', '10'],
        expectedRow: ['1', 'old', '10']
      })
    ).toBeNull()
  })

  it('brings a row back whose delete failed, at its old place', () => {
    const rows = [HEADER, ['1', 'a', '10'], ['3', 'c', '30']]

    expect(
      revertWriteRows(rows, {
        type: 'delete',
        sheetName: 's',
        rowNumber: 3,
        expectedRow: ['2', 'b', '20']
      })
    ).toEqual([HEADER, ['1', 'a', '10'], ['2', 'b', '20'], ['3', 'c', '30']])
  })

  it('cannot undo a whole-tab replace', () => {
    expect(
      revertWriteRows([HEADER], { type: 'replace', sheetName: 's', rows: [], columnCount: 3 })
    ).toBeNull()
  })
})

describe('applyWriteRows', () => {
  it('redoes what revert undid', () => {
    const original = [HEADER, ['1', 'a', '10'], ['2', 'b', '20']]
    const update = {
      type: 'update' as const,
      sheetName: 's',
      rowNumber: 3,
      row: ['2', 'B', '25'],
      expectedRow: ['2', 'b', '20']
    }
    const del = { type: 'delete' as const, sheetName: 's', rowNumber: 2, expectedRow: original[1] }

    expect(applyWriteRows(original, update)).toEqual([HEADER, ['1', 'a', '10'], ['2', 'B', '25']])
    expect(applyWriteRows(original, del)).toEqual([HEADER, ['2', 'b', '20']])
    expect(applyWriteRows(original, { type: 'append', sheetName: 's', row: ['3'] })).toHaveLength(4)
  })

  it('skips an edit whose row is no longer in the mirror', () => {
    expect(
      applyWriteRows([HEADER], {
        type: 'update',
        sheetName: 's',
        rowNumber: 2,
        row: ['1'],
        expectedRow: ['1', 'x', '1']
      })
    ).toBeNull()
  })
})
