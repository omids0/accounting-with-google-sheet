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

vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async () => [],
  updateSheetRow: vi.fn(),
  deleteSheetRow: vi.fn()
}))
vi.mock('./settings', () => ({ getSettings: () => ({ forms: [EXPENSE] }) }))

const { buildFieldColumnMap, buildHeaders } = await import('./sheetsHeaders')
const { legacyLayoutPlan, remapLegacyRow, isLegacyRow } = await import('./legacyRowLayout')
const { fetchRecords } = await import('./sheetsRecords')
const { initStore, setSheetAllRows } = await import('./spreadsheetStore')

const HEADER = [...buildHeaders(FIELDS), 'ثبت‌کننده']

const LEGACY_ROWS = [
  [
    '78c3356f-b5df-422a-8482-4df943899ad1',
    '۱۴۰۵/۵/۲۶, ۲۱:۴۲:۲۱',
    '2026-08-17',
    'آیسپک با فاطمه',
    '680000',
    'خوراک و نوشیدنی'
  ],
  [
    'ce2ec2ce-836a-4bfb-a9bc-adf6f5f31322',
    '۱۴۰۵/۵/۲۵, ۱۳:۲۹:۴۶',
    '2026-07-21',
    'مجموع اقساط',
    '22411278',
    'قسط',
    'بر اساس دسته‌بندی مجموعا وارد شده است.'
  ],
  [
    '201b4c73-a849-41eb-bbea-6a3a24d02d92',
    '۱۴۰۵/۶/۱, ۱۴:۵۶:۵۳',
    '2026-08-23',
    'خرید اشتراک Cursor',
    '2000000',
    'AI',
    'خرید اشتراک با میلاد از ایرانیکارت',
    'Cursor'
  ],
  [
    '1788309f-bffe-4d52-b5ad-aa8f273fa0c1',
    '۱۴۰۵/۷/۲۸, ۱۰:۲۰:۴۳',
    '2026-10-15',
    'روغن موتور — 206',
    '5100000',
    'خودرو',
    '',
    'روغن موتور',
    '',
    'بله',
    '',
    'user@example.com'
  ]
]

const NEW_ROW = [
  'f464',
  '۱۴۰۵/۷/۲۹, ۱۶:۵۹:۰۱',
  '2026-10-21',
  'QA تست ثبت',
  'سایر',
  '',
  '12345',
  '',
  'بله',
  '',
  '',
  '',
  'user@example.com'
]

function plan() {
  return legacyLayoutPlan(EXPENSE, buildFieldColumnMap(HEADER, FIELDS), 12, HEADER.length)
}

describe('legacy income/expense row layout', () => {
  it('only applies to the header that hides legacy rows', () => {
    expect(plan()).not.toBeNull()
    // The legacy header itself (amount before category) is read as it is.
    const legacyHeader = ['شناسه', 'زمان ثبت', ...FIELDS.map(field => field.label)]

    expect(
      legacyLayoutPlan(EXPENSE, buildFieldColumnMap(legacyHeader, FIELDS), -1, legacyHeader.length)
    ).toBeNull()
    expect(
      legacyLayoutPlan(
        { ...EXPENSE, type: 'custom' } as unknown as CustomForm,
        buildFieldColumnMap(HEADER, FIELDS),
        12,
        13
      )
    ).toBeNull()
  })

  it('recognises the four real legacy rows and not the current one', () => {
    for (const row of LEGACY_ROWS) expect(isLegacyRow(row, plan()!)).toBe(true)
    expect(isLegacyRow(NEW_ROW, plan()!)).toBe(false)
  })

  it("moves a short legacy row into today's columns", () => {
    const row = remapLegacyRow(LEGACY_ROWS[0], plan())

    expect(row).toHaveLength(13)
    expect(row[0]).toBe(LEGACY_ROWS[0][0])
    expect(row[1]).toBe(LEGACY_ROWS[0][1])
    expect(row[2]).toBe('2026-08-17')
    expect(row[3]).toBe('آیسپک با فاطمه')
    expect(row[4]).toBe('خوراک و نوشیدنی')
    expect(row[6]).toBe('680000')
    expect(row.slice(7)).toEqual(['', '', '', '', '', ''])
  })

  it('keeps the note, subcategory and the writer of a row that has no line-items column', () => {
    const row = remapLegacyRow(LEGACY_ROWS[3], plan())

    expect(row[4]).toBe('خودرو')
    expect(row[5]).toBe('روغن موتور')
    expect(row[6]).toBe('5100000')
    expect(row[8]).toBe('بله')
    expect(row[10]).toBe('')
    expect(row[11]).toBe('')
    expect(row[12]).toBe('user@example.com')
  })

  it('reads a legacy row that has line items and a writer after them', () => {
    const legacy = [...LEGACY_ROWS[3].slice(0, 11), '[{"n":"a@b"}]', 'me@example.com']

    const row = remapLegacyRow(legacy, plan())

    expect(row[10]).toBe('[{"n":"a@b"}]')
    expect(row[11]).toBe('')
    expect(row[12]).toBe('me@example.com')
  })

  it('leaves a current row (and the same object) untouched', () => {
    expect(remapLegacyRow(NEW_ROW, plan())).toBe(NEW_ROW)
    expect(remapLegacyRow(LEGACY_ROWS[0], null)).toBe(LEGACY_ROWS[0])
  })

  it('is idempotent: a remapped row is no longer legacy', () => {
    const once = remapLegacyRow(LEGACY_ROWS[2], plan())

    expect(remapLegacyRow(once, plan())).toBe(once)
  })

  it('handles empty rows, rows shorter than the header and numeric titles', () => {
    expect(remapLegacyRow([], plan())).toEqual([])
    expect(remapLegacyRow(['id'], plan())).toEqual(['id'])
    expect(remapLegacyRow(['id', 't', '2026-01-01', 'x', '', 'سایر'], plan())).toHaveLength(6)

    // A numeric title does not turn a current row into a legacy one.
    const numericTitle = ['id', 't', '2026-01-01', '12345', 'سایر', '', '500']

    expect(isLegacyRow(numericTitle, plan()!)).toBe(false)
    // Nor does it hide a legacy one.
    const legacyNumericTitle = ['id', 't', '2026-01-01', '12345', '500', 'سایر']

    expect(remapLegacyRow(legacyNumericTitle, plan())[6]).toBe('500')
    expect(remapLegacyRow(legacyNumericTitle, plan())[3]).toBe('12345')
  })

  it('accepts Persian digits and thousands separators in the legacy amount', () => {
    expect(isLegacyRow(['id', 't', 'd', 'x', '۶۸۰٬۰۰۰', 'خوراک'], plan()!)).toBe(true)
  })
})

describe('records read from a tab with legacy rows', () => {
  const ID = 'legacy-sheet'

  beforeEach(() => {
    initStore(ID)
    setSheetAllRows(ID, 'هزینه', [HEADER, ...LEGACY_ROWS, NEW_ROW])
  })

  it('reads the amount, category, subcategory and writer of both layouts', async () => {
    const records = await fetchRecords(ID, EXPENSE)

    expect(records.map(r => Number(r.values.amount))).toEqual([
      680000, 22411278, 2000000, 5100000, 12345
    ])
    expect(records.map(r => r.values.category)).toEqual([
      'خوراک و نوشیدنی',
      'قسط',
      'AI',
      'خودرو',
      'سایر'
    ])
    expect(records[1].values.note).toBe('بر اساس دسته‌بندی مجموعا وارد شده است.')
    expect(records[2].values.subCategory).toBe('Cursor')
    expect(records[3].values.subCategory).toBe('روغن موتور')
    expect(records[3].values.note).toBe('')
    expect(records[3].writer).toBe('user@example.com')
    expect(records[4].writer).toBe('user@example.com')
  })
})
