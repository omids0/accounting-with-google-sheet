import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'

const FIELDS: CustomForm['fields'] = [
  { id: 'date', label: 'تاریخ', type: 'date', required: true },
  { id: 'title', label: 'عنوان', type: 'text', required: false },
  { id: 'amount', label: 'مبلغ', type: 'number', required: true },
  { id: 'category', label: 'دسته‌بندی', type: 'select', required: true },
  { id: 'note', label: 'توضیحات', type: 'text', required: false },
  { id: 'subCategory', label: 'زیردسته', type: 'select', required: false },
  { id: 'walletAccount', label: 'حساب', type: 'select', required: false },
  { id: 'walletApply', label: 'اثر بر موجودی', type: 'select', required: false },
  { id: 'counterparty', label: 'طرف حساب', type: 'select', required: false },
  { id: 'lineItems', label: 'اقلام', type: 'text', required: false }
]

const EXPENSE: CustomForm = {
  id: 'form_expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: FIELDS
}

/** The sheet itself, apart from the app's local copy. */
const remote = vi.hoisted(() => ({ rows: [] as string[][], requests: [] as { body: string }[] }))

vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async () => remote.rows.map(row => [...row])
}))
vi.mock('./sheetsApi', () => ({
  SHEETS_API: 'https://sheets.test',
  apiRequest: async (_url: string, init: { body: string }) => {
    remote.requests.push(init)

    const { data } = JSON.parse(init.body) as {
      data: { range: string; values: (string | number)[][] }[]
    }

    for (const part of data) {
      const row = Number(/!A(\d+):/.exec(decodeURIComponent(part.range))?.[1])

      remote.rows[row - 1] = part.values[0].map(String)
    }

    return {}
  }
}))
vi.mock('./sheetSyncAnnounce', () => ({
  readDriveTime: async () => null,
  announceWrites: async () => undefined
}))
vi.mock('./sheetSyncOutbox', () => ({
  withOutboxLock: (_id: string, task: () => Promise<unknown>) => task()
}))
vi.mock('./settings', () => ({ getSettings: () => ({ forms: [EXPENSE] }) }))

const { buildHeaders } = await import('./sheetsHeaders')
const { describeFix, scanLegacyRows } = await import('./legacyRowRepair')
const { initStore, setSheetAllRows } = await import('./spreadsheetStore')

const ID = 'review-sheet'

const HEADER = [...buildHeaders(FIELDS), 'ثبت‌کننده']

describe('telling legacy rows from current ones that look alike', () => {
  const CATEGORIES = ['AI', 'خوراک', '۱۴۰۵']

  const FORM: CustomForm = {
    ...EXPENSE,
    sheetName: 'هزینه۲',
    fields: FIELDS.map(field =>
      field.id === 'category' ? { ...field, options: CATEGORIES } : field
    )
  }

  const scan = (rows: string[][], header = HEADER) => {
    setSheetAllRows(ID, 'هزینه۲', [header, ...rows])

    return scanLegacyRows(ID, [FORM])
  }

  beforeEach(() => initStore(ID))

  it('repairs a legacy row whose note is a number', () => {
    const { fixes, review } = scan([
      ['n1', 't', '2026-08-23', 'عنوان', '500000', 'AI', '12345'],
      ['n2', 't', '2026-08-23', 'عنوان', '700000', 'خوراک', '1405']
    ])

    expect(review).toEqual([])
    expect(fixes).toHaveLength(2)
    expect(fixes[0].after[4]).toBe('AI')
    expect(fixes[0].after[6]).toBe('500000')
    expect(fixes[0].after[11]).toBe('12345')
    expect(fixes[1].after[6]).toBe('700000')
    expect(fixes[1].after[11]).toBe('1405')
  })

  it('leaves a current row with a numeric category and an amount alone', () => {
    const { fixes, review } = scan([
      ['c1', 't', '2026-08-23', 'عنوان', '۱۴۰۵', '', '500000', '', '', '', '', '', 'a@b.com']
    ])

    expect(fixes).toEqual([])
    expect(review).toEqual([])
  })

  it('sets aside, never rewrites, a current row whose numeric category has no amount', () => {
    const { fixes, review } = scan([['c2', 't', '2026-08-23', 'عنوان', '۱۴۰۵', '', '']])

    expect(fixes).toEqual([])
    expect(review).toEqual([{ sheetName: 'هزینه۲', rowNumber: 2, id: 'c2', reason: 'ambiguous' }])
  })

  it('sets aside a legacy row that has a cell with no column to go to', () => {
    const headerWithoutWriter = HEADER.slice(0, 12)

    const { fixes, review } = scan(
      [
        [
          'w1',
          't',
          '2026-08-23',
          'عنوان',
          '500000',
          'AI',
          '',
          '',
          '',
          'بله',
          '',
          '',
          'me@example.com'
        ]
      ],
      headerWithoutWriter
    )

    expect(fixes).toEqual([])
    expect(review).toEqual([{ sheetName: 'هزینه۲', rowNumber: 2, id: 'w1', reason: 'unmapped' }])
  })

  it('describes a repair in words: title, category and amount before and after', () => {
    const [fix] = scan([['d1', 't', '2026-08-23', 'اشتراک', '2000000', 'AI']]).fixes

    expect(describeFix(fix)).toEqual({
      rowNumber: 2,
      title: 'اشتراک',
      before: { category: '2000000', amount: '' },
      after: { category: 'AI', amount: '2000000' }
    })
  })
})
