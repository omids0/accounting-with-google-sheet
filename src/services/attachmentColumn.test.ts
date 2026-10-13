import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CHECK_ATTACHMENT_COLUMN,
  findAttachmentColumn,
  findEntityRow,
  INSTALLMENT_ATTACHMENT_COLUMN
} from './attachmentColumn'
import { CHECKS_HEADERS, INSTALLMENTS_HEADERS } from './sheetHeaders'
import { CHECKS_SHEET } from './sheetNames'
import { buildFieldColumnMap } from './sheetsHeaders'
import { updateSheetRow } from './sheetsRows'
import { clearStore, getSheetRow, initStore, setSheetAllRows } from './spreadsheetStore'
import type { FieldConfig } from '../types'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn() }))

const SHEET_ID = 'sheet-attachment-column'

const RECORD_TAB = 'هزینه'

describe('attachment column', () => {
  beforeEach(() => {
    clearStore(SHEET_ID)
    initStore(SHEET_ID)
    setSheetAllRows(SHEET_ID, RECORD_TAB, [
      ['شناسه', 'زمان ثبت', 'مبلغ', 'پیوست'],
      ['r1', 't', '100', 'f1,f2']
    ])
    setSheetAllRows(SHEET_ID, CHECKS_SHEET, [
      CHECKS_HEADERS.slice(0, -2),
      ['c1', 't', '12', 'x', '5', '', '', 'خیر', '', '', '', 'g1']
    ])
  })

  it('sits just before «ثبت‌کننده» on the fixed tabs', () => {
    expect(CHECKS_HEADERS[CHECK_ATTACHMENT_COLUMN]).toBe('پیوست')
    expect(CHECK_ATTACHMENT_COLUMN).toBe(CHECKS_HEADERS.length - 2)
    expect(INSTALLMENT_ATTACHMENT_COLUMN).toBe(INSTALLMENTS_HEADERS.length - 2)
  })

  it('follows the header on record tabs and the fixed index on checks', () => {
    expect(findAttachmentColumn(SHEET_ID, RECORD_TAB)).toBe(3)
    // An older checks tab without the header label still reads by position.
    expect(findAttachmentColumn(SHEET_ID, CHECKS_SHEET)).toBe(CHECK_ATTACHMENT_COLUMN)
    expect(findAttachmentColumn(SHEET_ID, 'بدون پیوست')).toBe(-1)
  })

  it('finds a row by id in its tab or any other mirrored tab', () => {
    expect(findEntityRow(SHEET_ID, RECORD_TAB, 'r1')?.rowNumber).toBe(2)
    expect(findEntityRow(SHEET_ID, 'رکوردها_1404', 'r1')?.sheetName).toBe(RECORD_TAB)
    expect(findEntityRow(SHEET_ID, RECORD_TAB, 'nope')).toBeNull()
  })

  it('keeps the ids when an entity writer rebuilds the row without them', async () => {
    await updateSheetRow(SHEET_ID, RECORD_TAB, 2, ['r1', 't', '250', ''])
    expect(getSheetRow(SHEET_ID, RECORD_TAB, 2)).toEqual(['r1', 't', '250', 'f1,f2'])

    // A check row is rebuilt one cell short of the column.
    await updateSheetRow(SHEET_ID, CHECKS_SHEET, 2, ['c1', 't', '12', 'y'])
    expect(getSheetRow(SHEET_ID, CHECKS_SHEET, 2)?.[CHECK_ATTACHMENT_COLUMN]).toBe('g1')
  })

  it('lets the attachment service clear the cell on purpose', async () => {
    await updateSheetRow(SHEET_ID, RECORD_TAB, 2, ['r1', 't', '100', ''], undefined, true)
    expect(getSheetRow(SHEET_ID, RECORD_TAB, 2)).toEqual(['r1', 't', '100', ''])
  })

  it('never maps a form field without a header onto «پیوست»', () => {
    const fields = [
      { id: 'amount', label: 'مبلغ' },
      { id: 'note', label: 'توضیحات' }
    ] as FieldConfig[]
    const map = buildFieldColumnMap(['شناسه', 'زمان ثبت', 'مبلغ', 'پیوست'], fields)

    expect(map.get('amount')).toBe(2)
    expect(map.get('note')).toBe(4)
  })
})
