import { describe, expect, it } from 'vitest'

import {
  buildCopyRow,
  copyOperation,
  findCopyByRef,
  sharedCategory,
  sharedRecordForm,
  sharedRef
} from './sharedLinkRows'
import { buildHeaders } from './sheetsHeaders'
import {
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID
} from '../components/form/recordFieldIds'
import { SHARED_LINK_FIELD_ID } from '../components/form/sharedFields'
import { WRITER_HEADER } from '../utils/writerColumn'

const form = sharedRecordForm('expense')
const headers = [...buildHeaders(form.fields), WRITER_HEADER]
const ME = 'me@x.com'
const REF = sharedRef('p1', 'r9')

const SENTINELS = {
  note: 'SENTINEL_NOTE',
  [LINE_ITEMS_FIELD_ID]: 'SENTINEL_ITEMS',
  attachments: 'SENTINEL_FILE',
  [COUNTERPARTY_FIELD_ID]: 'SENTINEL_PERSON',
  [WALLET_ACCOUNT_FIELD_ID]: 'SENTINEL_WALLET',
  [WALLET_APPLY_FIELD_ID]: 'SENTINEL_APPLY',
  [SHARED_LINK_FIELD_ID]: 'SENTINEL_LINK',
  subCategory: 'SENTINEL_SUB',
  tags: 'SENTINEL_TAG',
  smsText: 'SENTINEL_SMS'
}

const copy = (values: Record<string, string | number> = {}) =>
  buildCopyRow({
    form,
    headers,
    recordId: 'copy-1',
    values: { date: '2026-10-20', title: 'میوه', amount: 850000, category: 'خوراک', ...values },
    split: 'equal',
    payer: ME,
    creator: ME,
    category: 'خوراک',
    ref: REF,
    createdAt: 'now'
  })

const cell = (row: string[], label: string) => row[headers.indexOf(label)]

describe('sharedRef', () => {
  it('is share:<personalSpreadsheetId>:<recordId>', () => {
    expect(sharedRef('p1', 'r9')).toBe('share:p1:r9')
  })
})

describe('buildCopyRow', () => {
  it('carries only the whitelist: title, amount, date, category, payer, split, creator, ref', () => {
    const row = copy(SENTINELS)

    expect(row[0]).toBe('copy-1')
    expect(cell(row, 'عنوان')).toBe('میوه')
    expect(cell(row, 'مبلغ')).toBe('850000')
    expect(cell(row, 'تاریخ')).toBe('2026-10-20')
    expect(cell(row, 'دسته‌بندی')).toBe('خوراک')
    expect(cell(row, 'پرداخت‌کننده')).toBe(ME)
    expect(cell(row, 'تقسیم')).toBe('equal')
    expect(cell(row, 'ایجادکننده')).toBe(ME)
    expect(cell(row, 'مرجع')).toBe(REF)
    expect(cell(row, WRITER_HEADER)).toBe(ME)
    expect(row).toHaveLength(headers.length)
    expect(row.join('|')).not.toMatch(/SENTINEL/)
  })

  it('uses the category it is given, never the personal one', () => {
    const row = copy({ category: 'رستوران خصوصی' })

    expect(cell(row, 'دسته‌بندی')).toBe('خوراک')
    expect(row.join('|')).not.toContain('رستوران خصوصی')
  })

  it('writes no payer or split for an income copy (report only)', () => {
    const income = sharedRecordForm('income')
    const incomeHeaders = buildHeaders(income.fields)
    const row = buildCopyRow({
      form: income,
      headers: incomeHeaders,
      recordId: 'c',
      values: { title: 'حقوق', amount: 1, date: '2026-10-01' },
      split: 'equal',
      payer: ME,
      creator: ME,
      category: 'سایر',
      ref: REF
    })

    expect(row[incomeHeaders.indexOf('پرداخت‌کننده')]).toBe('')
    expect(row[incomeHeaders.indexOf('تقسیم')]).toBe('')
    expect(row[incomeHeaders.indexOf('ایجادکننده')]).toBe(ME)
  })

  it('follows the target sheet own header order', () => {
    const shuffled = ['شناسه', 'زمان ثبت', 'مرجع', 'مبلغ', 'یادداشت شریک', 'عنوان']
    const row = buildCopyRow({
      form,
      headers: shuffled,
      recordId: 'x',
      values: { title: 't', amount: 5 },
      split: 'equal',
      payer: ME,
      creator: ME,
      category: 'سایر',
      ref: REF
    })

    expect(row.slice(2)).toEqual([REF, '5', '', 't'])
  })
})

describe('sharedCategory', () => {
  it('keeps an exact name of the shared list, else «سایر»', () => {
    expect(sharedCategory('خوراک', ['خوراک', 'سایر'])).toBe('خوراک')
    expect(sharedCategory('قمار', ['خوراک', 'سایر'])).toBe('سایر')
    expect(sharedCategory('تسویه', ['تسویه', 'سایر'])).toBe('سایر')
  })
})

describe('findCopyByRef and copyOperation', () => {
  const base = 'هزینه'
  const archive = 'هزینه 1404'
  const landed = copy()
  const tabs = new Map([
    [base, [headers]],
    [archive, [headers, ['other'], landed]]
  ])

  const task = (kind: 'create' | 'update' | 'delete', extra = {}) => ({
    kind,
    ref: REF,
    values: { date: '2026-10-20', title: 'میوه', amount: 850000, category: 'خوراک' },
    split: 'equal' as const,
    payer: '',
    ...extra
  })

  const run = (t: ReturnType<typeof task>, from = tabs) =>
    copyOperation({
      task: t,
      form,
      base,
      tabs: from,
      categories: ['خوراک', 'سایر'],
      me: ME,
      createdAt: 'now',
      newId: 'new-id'
    })

  it('finds a copy in a yearly archive tab', () => {
    expect(findCopyByRef(tabs, REF)).toMatchObject({ sheetName: archive, rowNumber: 3 })
    expect(findCopyByRef(tabs, 'share:p1:none')).toBeNull()
  })

  it('appends nothing for a create whose copy already landed', () => {
    expect(run(task('create'))).toBeNull()
  })

  it('updates the found row in place, keeping its id', () => {
    const op = run(task('update', { values: { ...task('update').values, amount: 900000 } }))

    expect(op).toMatchObject({ type: 'update', sheetName: archive, rowNumber: 3 })
    expect(op && 'row' in op && op.row[0]).toBe('copy-1')
    expect(op && 'row' in op && cell(op.row as string[], 'مبلغ')).toBe('900000')
  })

  it('appends a new copy to the base tab when none exists', () => {
    const op = run(task('create'), new Map([[base, [headers]]]))

    expect(op).toMatchObject({ type: 'append', sheetName: base })
    expect(op && 'row' in op && op.row[0]).toBe('new-id')
  })

  it('treats a delete of a missing ref as done', () => {
    expect(run(task('delete'), new Map([[base, [headers]]]))).toBeNull()
    expect(run(task('delete'))).toMatchObject({ type: 'delete', sheetName: archive, rowNumber: 3 })
  })

  it('titles a copy with no typed title by the shared category it writes, never the personal one', () => {
    const op = run(
      task('create', {
        values: { date: '2026-10-20', title: '', amount: 5, category: 'رستوران خصوصی' }
      }),
      new Map([[base, [headers]]])
    )
    const row = op && 'row' in op ? (op.row as string[]) : []

    expect(cell(row, 'عنوان')).toBe('سایر')
    expect(row.join('|')).not.toContain('رستوران خصوصی')
  })

  it('keeps the split, payer and category of the copy when the edit leaves them unset', () => {
    const chosen = buildCopyRow({
      form,
      headers,
      recordId: 'copy-2',
      values: { date: '2026-10-20', title: 'میوه', amount: 850000 },
      split: 'only:mina@x.com',
      payer: 'mina@x.com',
      creator: ME,
      category: 'خانه',
      ref: REF,
      createdAt: 'then'
    })
    const edited = task('update', {
      values: { date: '2026-10-20', title: 'میوهٔ تازه', amount: 850000, category: '' },
      split: '',
      payer: ''
    })
    const op = run(edited, new Map([[base, [headers, chosen]]]))
    const row = op && 'row' in op ? (op.row as string[]) : []

    expect(cell(row, 'عنوان')).toBe('میوهٔ تازه')
    expect(cell(row, 'تقسیم')).toBe('only:mina@x.com')
    expect(cell(row, 'پرداخت‌کننده')).toBe('mina@x.com')
    expect(cell(row, 'دسته‌بندی')).toBe('خانه')
  })

  it('never appends a copy without a date or an amount', () => {
    const empty = new Map([[base, [headers]]])

    expect(run(task('create', { values: { date: '', title: 't', amount: 5 } }), empty)).toBeNull()
    expect(
      run(task('create', { values: { date: '2026-10-20', title: 't', amount: '' } }), empty)
    ).toBeNull()
  })

  it('clears only the ref when unlinking', () => {
    const op = run(task('update', { unlink: true, values: {} }))

    expect(op && 'row' in op && cell(op.row as string[], 'مرجع')).toBe('')
    expect(op && 'row' in op && cell(op.row as string[], 'مبلغ')).toBe('850000')
  })
})
