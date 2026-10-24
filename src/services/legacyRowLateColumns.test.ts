import { describe, expect, it } from 'vitest'

import { legacyLayoutPlan, losesCells, remapLegacyRow } from './legacyRowLayout'
import { buildFieldColumnMap, buildHeaders } from './sheetsHeaders'
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

// Rows written while receipts and the writer were appended BEFORE the counterparty:
// 10 = receipt photo (Drive file id), 11 = writer, 12 = counterparty.
const LATE_ROW = [
  '025b7084-5aab-449d-a0e5-c9bb6ab4433d',
  '۱۴۰۵/۷/۲۰, ۲۰:۳۷:۳۴',
  '2026-10-12',
  'برای مراسم مامان کاخلمیش',
  '670000',
  'قرض',
  'ثبت از پیامک',
  'مامان',
  '52a7944b-8c3a-4813-bb26-b011ca0b0c98',
  'بله',
  '1bVS4klXSeGzqQV9XlEqHn6oj91bJJb7h',
  'user@example.com',
  'نرگس بالو'
]

const planFor = (header: string[], attachmentColumn: number) =>
  legacyLayoutPlan(
    EXPENSE,
    buildFieldColumnMap(header, FIELDS),
    header.indexOf('ثبت‌کننده'),
    header.length,
    attachmentColumn
  )!

const cellOf = (row: unknown[], header: string[], label: string) => row[header.indexOf(label)]

describe('legacy rows whose late columns are in another order', () => {
  it('reads the counterparty name, never the receipt id, when the tab has no receipts column', () => {
    const header = [...buildHeaders(FIELDS), 'ثبت‌کننده']

    const next = remapLegacyRow([...LATE_ROW], planFor(header, -1))

    expect(cellOf(next, header, 'طرف حساب')).toBe('نرگس بالو')
    expect(cellOf(next, header, 'ثبت‌کننده')).toBe('user@example.com')
    expect(cellOf(next, header, 'اقلام')).toBe('')
    expect(cellOf(next, header, 'مبلغ')).toBe('670000')
    expect(cellOf(next, header, 'دسته‌بندی')).toBe('قرض')
    // The receipt id has no column here, so a repair must not rewrite the row.
    expect(losesCells(LATE_ROW, next)).toBe(true)
  })

  it('keeps the receipt id under «پیوست» when the tab has the column', () => {
    const header = [...buildHeaders(FIELDS), 'پیوست', 'ثبت‌کننده']

    const next = remapLegacyRow([...LATE_ROW], planFor(header, header.indexOf('پیوست')))

    expect(cellOf(next, header, 'پیوست')).toBe('1bVS4klXSeGzqQV9XlEqHn6oj91bJJb7h')
    expect(cellOf(next, header, 'طرف حساب')).toBe('نرگس بالو')
    expect(cellOf(next, header, 'ثبت‌کننده')).toBe('user@example.com')
    expect(losesCells(LATE_ROW, next)).toBe(false)
  })

  it('still reads the plain order: counterparty, items, writer', () => {
    const header = [...buildHeaders(FIELDS), 'ثبت‌کننده']

    const row = [...LATE_ROW.slice(0, 10), 'علی', '[{"n":"موز","a":5}]', 'user@example.com']

    const next = remapLegacyRow(row, planFor(header, -1))

    expect(cellOf(next, header, 'طرف حساب')).toBe('علی')
    expect(cellOf(next, header, 'اقلام')).toBe('[{"n":"موز","a":5}]')
    expect(cellOf(next, header, 'ثبت‌کننده')).toBe('user@example.com')
  })
})
