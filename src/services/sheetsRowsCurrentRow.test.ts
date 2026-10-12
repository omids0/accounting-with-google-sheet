import { beforeEach, describe, expect, it } from 'vitest'

import { currentRowNumberFor } from './sheetsRows'
import { clearStore, initStore, setSheetAllRows } from './spreadsheetStore'

const SHEET_ID = 'sheet-current-row'

describe('currentRowNumberFor', () => {
  beforeEach(() => {
    clearStore(SHEET_ID)
    initStore(SHEET_ID)
    setSheetAllRows(SHEET_ID, 'چک‌ها', [
      ['شناسه', 'مبلغ'],
      ['a', '1'],
      ['c', '3']
    ])
    setSheetAllRows(SHEET_ID, 'دسته‌بندی‌ها', [
      ['نوع', 'دسته‌بندی'],
      ['درآمد', 'حقوق'],
      ['هزینه', 'خوراک']
    ])
  })

  it('keeps the row number when the id there still matches', () => {
    expect(currentRowNumberFor(SHEET_ID, 'چک‌ها', 3, ['c', '30'])).toBe(3)
  })

  it('follows the id when an earlier delete shifted the row up', () => {
    // «c» was row 4 when the form opened; deleting «b» moved it to row 3.
    expect(currentRowNumberFor(SHEET_ID, 'چک‌ها', 4, ['c', '30'])).toBe(3)
    expect(currentRowNumberFor(SHEET_ID, 'چک‌ها', 2, ['c', '30'])).toBe(3)
  })

  it('leaves sheets without an id column alone', () => {
    expect(currentRowNumberFor(SHEET_ID, 'دسته‌بندی‌ها', 2, ['هزینه', 'اجاره'])).toBe(2)
  })

  it('leaves the row number when the id is missing from the sheet', () => {
    expect(currentRowNumberFor(SHEET_ID, 'چک‌ها', 2, ['zzz', '9'])).toBe(2)
  })
})
