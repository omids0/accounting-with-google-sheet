import { describe, expect, it } from 'vitest'

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

const { buildFieldColumnMap, buildHeaders } = await import('./sheetsHeaders')
const { classifyRow, legacyLayoutPlan, losesCells, remapLegacyRow } = await import(
  './legacyRowLayout'
)

const HEADER = [...buildHeaders(FIELDS), 'ثبت‌کننده']

const plan = () =>
  legacyLayoutPlan(EXPENSE, buildFieldColumnMap(HEADER, FIELDS), 12, HEADER.length)!

describe('classifying rows with numbers in the category column', () => {
  const known = {
    ...EXPENSE,
    fields: FIELDS.map(field =>
      field.id === 'category' ? { ...field, options: ['AI', '۱۴۰۵'] } : field
    )
  }

  const knownPlan = () =>
    legacyLayoutPlan(known, buildFieldColumnMap(HEADER, known.fields), 12, HEADER.length)!

  it('reads a legacy row with a numeric note as legacy once categories are known', () => {
    const row = ['i', 't', 'd', 'x', '500000', 'AI', '12345']

    expect(classifyRow(row, knownPlan())).toBe('legacy')
    expect(remapLegacyRow(row, knownPlan())[6]).toBe('500000')
    expect(remapLegacyRow(row, knownPlan())[11]).toBe('12345')
  })

  it('keeps a current row with a numeric category and an amount as current', () => {
    expect(classifyRow(['i', 't', 'd', 'x', '۱۴۰۵', '', '500000'], knownPlan())).toBe('current')
  })

  it('calls a numeric known category with no amount ambiguous, and reads it as it stands', () => {
    const row = ['i', 't', 'd', 'x', '۱۴۰۵', '', '']

    expect(classifyRow(row, knownPlan())).toBe('ambiguous')
    expect(remapLegacyRow(row, knownPlan())).toBe(row)
  })

  it("reports a cell that has no column in today's header", () => {
    const row = ['i', 't', 'd', 'x', '500000', 'AI', '', '', '', 'بله', '', '', 'me@example.com']

    expect(losesCells(row, remapLegacyRow(row, plan()))).toBe(false)
    expect(
      losesCells(
        row,
        remapLegacyRow(
          row,
          legacyLayoutPlan(EXPENSE, buildFieldColumnMap(HEADER, FIELDS), -1, HEADER.length)
        )
      )
    ).toBe(true)
  })
})
