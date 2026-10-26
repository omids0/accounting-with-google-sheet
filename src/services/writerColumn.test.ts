import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm, FieldConfig } from '../types'
import { headerWriterColumn, parseWriter, withWriterCell } from '../utils/writerColumn'

const writeSheetHeaders = vi.fn(async () => undefined)
let email: string | null = 'Me@Example.com'

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: vi.fn() }))
vi.mock('./auth', () => ({ getUserEmail: () => email }))
vi.mock('./sheetsEnsure', () => ({ writeSheetHeaders }))
vi.mock('./sheetGrid', () => ({
  withGridGrowth: (_id: string, _tab: string, _r: number, _c: number, write: () => unknown) =>
    write()
}))
vi.mock('./settings', () => ({ getSettings: () => ({ forms: [] }) }))

const { CHECK_WRITER_COLUMN, DANG_WRITER_COLUMN, ensureWriterColumn, RECEIVABLE_WRITER_COLUMN } =
  await import('./writerColumn')
const { CHECKS_HEADERS, DANG_HEADERS, RECEIVABLES_HEADERS } = await import('./sheetHeaders')
const { CHECKS_SHEET, DANG_SHEET } = await import('./sheetNames')
const { dangToRow, rowToDang } = await import('./dangRow')
const { buildFieldColumnMap } = await import('./sheetsHeaders')
const { appendRecord, fetchRecords } = await import('./sheetsRecords')
const { updateSheetRow } = await import('./sheetsRows')
const { clearStore, getSheetRow, initStore, setSheetAllRows } = await import('./spreadsheetStore')

const SHEET_ID = 'sheet-writer-column'

const FORM = {
  id: 'expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  fields: [{ id: 'amount', label: 'مبلغ', type: 'number', order: 1 }]
} as unknown as CustomForm

describe('writer cell helpers', () => {
  it('reads old rows as empty and normalizes emails', () => {
    expect(parseWriter(undefined)).toBe('')
    expect(parseWriter(' Sara@Example.com ')).toBe('sara@example.com')
  })

  it('pads the row up to the column', () => {
    expect(withWriterCell(['a'], 3, 'x@y.z')).toEqual(['a', '', '', 'x@y.z'])
    expect(withWriterCell(['a'], -1, 'x@y.z')).toEqual(['a'])
  })

  it('is followed by the payments column on dang; checks add the type after it and receivables two building columns', () => {
    expect(CHECK_WRITER_COLUMN).toBe(CHECKS_HEADERS.length - 2)
    expect(DANG_WRITER_COLUMN).toBe(DANG_HEADERS.length - 2)
    expect(DANG_HEADERS[DANG_HEADERS.length - 1]).toBe('پرداخت‌ها')
    expect(RECEIVABLE_WRITER_COLUMN).toBe(RECEIVABLES_HEADERS.length - 3)
    expect(headerWriterColumn(CHECKS_HEADERS)).toBe(CHECK_WRITER_COLUMN)
  })

  it('never maps a form field without a header onto «ثبت‌کننده»', () => {
    const fields = [
      { id: 'amount', label: 'مبلغ' },
      { id: 'note', label: 'توضیحات' }
    ] as FieldConfig[]
    const map = buildFieldColumnMap(['شناسه', 'زمان ثبت', 'مبلغ', 'ثبت‌کننده'], fields)

    expect(map.get('note')).toBe(4)
  })
})

describe('writer column on save', () => {
  beforeEach(() => {
    email = 'Me@Example.com'
    writeSheetHeaders.mockClear()
    clearStore(SHEET_ID)
    initStore(SHEET_ID)
    setSheetAllRows(SHEET_ID, FORM.sheetName, [
      ['شناسه', 'زمان ثبت', 'مبلغ'],
      ['old', 't', '100']
    ])
  })

  it('appends the header once and stamps every new record', async () => {
    await appendRecord(SHEET_ID, FORM, 'r1', 't', { amount: 5 })
    await appendRecord(SHEET_ID, FORM, 'r2', 't', { amount: 6 })
    await Promise.resolve()

    expect(getSheetRow(SHEET_ID, FORM.sheetName, 1)).toEqual([
      'شناسه',
      'زمان ثبت',
      'مبلغ',
      'ثبت‌کننده'
    ])
    expect(getSheetRow(SHEET_ID, FORM.sheetName, 3)).toEqual(['r1', 't', '5', 'me@example.com'])
    expect(ensureWriterColumn(SHEET_ID, FORM.sheetName)).toBe(3)
    await vi.waitFor(() => expect(writeSheetHeaders).toHaveBeenCalledTimes(1))
  })

  it('reads old rows without a writer as empty', async () => {
    await appendRecord(SHEET_ID, FORM, 'r1', 't', { amount: 5 })

    const records = await fetchRecords(SHEET_ID, FORM)

    expect(records.map(record => [record.id, record.writer])).toEqual([
      ['old', ''],
      ['r1', 'me@example.com']
    ])
  })

  it('stamps an update of a fixed tab at its fixed index', async () => {
    setSheetAllRows(SHEET_ID, CHECKS_SHEET, [
      CHECKS_HEADERS.slice(0, -1),
      ['c1', 't', '12', 'x', '5', '', '', 'خیر', '', '', '', '']
    ])
    await updateSheetRow(SHEET_ID, CHECKS_SHEET, 2, ['c1', 't', '12', 'y'])

    expect(getSheetRow(SHEET_ID, CHECKS_SHEET, 2)?.[CHECK_WRITER_COLUMN]).toBe('me@example.com')
    expect(getSheetRow(SHEET_ID, CHECKS_SHEET, 1)?.[CHECK_WRITER_COLUMN]).toBe('ثبت‌کننده')
  })

  it('stamps a dang row at index 12 and leaves the payments cell at 13 alone', async () => {
    const payments = [{ id: 'p1', amount: 40, paidAt: '2026-10-02', note: '' }]

    const dang = {
      id: 'd1',
      createdAt: 't',
      title: 'شام',
      category: 'خوراک',
      counterparty: 'علی',
      amount: 100,
      date: '2026-10-01',
      note: '',
      paid: false,
      paidAt: '',
      payments
    }

    setSheetAllRows(SHEET_ID, DANG_SHEET, [DANG_HEADERS, dangToRow(dang)])
    await updateSheetRow(SHEET_ID, DANG_SHEET, 2, dangToRow(dang))

    const saved = getSheetRow(SHEET_ID, DANG_SHEET, 2) ?? []

    expect(saved).toHaveLength(14)
    expect(saved[DANG_WRITER_COLUMN]).toBe('me@example.com')
    expect(saved[13]).toBe(JSON.stringify(payments))
    expect(rowToDang(saved, 2)).toMatchObject({ writer: 'me@example.com', payments })
  })

  it('leaves rows alone when signed out', async () => {
    email = null
    await appendRecord(SHEET_ID, FORM, 'r1', 't', { amount: 5 })

    expect(getSheetRow(SHEET_ID, FORM.sheetName, 1)).toHaveLength(3)
    expect(getSheetRow(SHEET_ID, FORM.sheetName, 3)).toEqual(['r1', 't', '5'])
  })
})
