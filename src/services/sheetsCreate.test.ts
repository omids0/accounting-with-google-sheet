import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSpreadsheet } from './sheetsCreate'
import { isSheetPrepared } from './sheetsMeta'
import type { CustomForm } from '../types'

const api = vi.hoisted(() => ({
  calls: [] as { url: string; body: Record<string, unknown> }[]
}))

vi.mock('./sheetsApi', () => ({
  SHEETS_API: 'https://sheets.test/v4/spreadsheets',
  apiRequest: async (url: string, options?: { body?: string }) => {
    api.calls.push({ url, body: options?.body ? JSON.parse(options.body) : {} })

    return { spreadsheetId: 'new-file' }
  }
}))

const form = (sheetName: string): CustomForm =>
  ({
    id: sheetName,
    name: sheetName,
    type: 'expense',
    sheetName,
    fields: [
      { id: 'title', label: 'عنوان', type: 'text', required: true },
      { id: 'amount', label: 'مبلغ', type: 'number', required: true }
    ]
  } as CustomForm)

describe('createSpreadsheet', () => {
  beforeEach(() => {
    api.calls.length = 0
  })

  it('makes the file with every tab in one request and writes all headers in one more', async () => {
    const id = await createSpreadsheet(
      'حسابداری · ساختمان نرگس',
      [form('هزینه'), form('درآمد')],
      [
        { sheetName: 'ساختمان', headers: ['نام', 'آدرس'], rows: [['نرگس', 'خیابان گل‌ها']] },
        { sheetName: 'واحدها', headers: ['شماره'] }
      ]
    )

    expect(id).toBe('new-file')
    expect(api.calls).toHaveLength(2)
    expect(api.calls[0].url).toBe('https://sheets.test/v4/spreadsheets')
    expect(api.calls[1].url).toBe('https://sheets.test/v4/spreadsheets/new-file/values:batchUpdate')

    const sheets = api.calls[0].body.sheets as {
      properties: { title: string; gridProperties: Record<string, number> }
    }[]

    expect(sheets.map(sheet => sheet.properties.title)).toEqual([
      'هزینه',
      'درآمد',
      'ساختمان',
      'واحدها'
    ])
    // Exact grids: the header plus the first rows, one free row under a bare frozen header.
    expect(sheets[2].properties.gridProperties).toEqual({
      rowCount: 2,
      columnCount: 2,
      frozenRowCount: 1
    })
    expect(sheets[3].properties.gridProperties).toEqual({
      rowCount: 2,
      columnCount: 1,
      frozenRowCount: 1
    })

    const data = api.calls[1].body.data as { range: string; values: string[][] }[]

    expect(api.calls[1].body.valueInputOption).toBe('RAW')
    expect(data).toHaveLength(4)
    expect(data[2]).toEqual({
      range: "'ساختمان'!A1:B2",
      values: [
        ['نام', 'آدرس'],
        ['نرگس', 'خیابان گل‌ها']
      ]
    })
    expect(data[0].values).toEqual([['شناسه', 'زمان ثبت', 'عنوان', 'مبلغ']])
  })

  it('marks every created tab as prepared so nothing is checked again', async () => {
    await createSpreadsheet('t', [form('هزینه')], [{ sheetName: 'واحدها', headers: ['شماره'] }])

    expect(isSheetPrepared('new-file', 'هزینه')).toBe(true)
    expect(isSheetPrepared('new-file', 'واحدها')).toBe(true)
    expect(isSheetPrepared('new-file', 'چیز دیگر')).toBe(false)
  })

  it('stays two requests for a personal spreadsheet with only the forms', async () => {
    await createSpreadsheet('t', [form('هزینه'), form('درآمد')])

    expect(api.calls).toHaveLength(2)
  })
})
