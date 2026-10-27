import { describe, expect, it } from 'vitest'

import {
  buildCopyRow,
  copyOperation,
  findCopyByRef,
  sharedRecordForm,
  sharedRef
} from './sharedLinkRows'
import { buildHeaders } from './sheetsHeaders'

const form = sharedRecordForm('expense')
const headers = buildHeaders(form.fields)
const ME = 'me@x.com'
const REF = sharedRef('p1', 'r9')
const base = 'هزینه'
const cell = (row: string[], label: string) => row[headers.indexOf(label)]

const copy = (recordId: string, ref: string, title = 'میوه') =>
  buildCopyRow({
    form,
    headers,
    recordId,
    values: { date: '2026-10-20', title, amount: 850000 },
    split: 'equal',
    payer: ME,
    creator: ME,
    category: 'خوراک',
    ref,
    createdAt: 'then'
  })

const run = (
  task: Parameters<typeof copyOperation>[0]['task'],
  tabs: Map<string, string[][]>,
  newId = 'task-1'
) =>
  copyOperation({
    task,
    form,
    base,
    tabs,
    categories: ['خوراک', 'سایر'],
    me: ME,
    createdAt: 'now',
    newId
  })

describe('a create retried after the page closed', () => {
  it('finds the copy by its stable row id when it carries no ref («فقط از حساب شخصی»)', () => {
    const tabs = new Map([[base, [headers, copy('task-1', '')]]])

    expect(findCopyByRef(tabs, REF, 'task-1')).toMatchObject({ sheetName: base, rowNumber: 2 })
    expect(findCopyByRef(tabs, REF)).toBeNull()
  })

  it('appends no second copy when the unlinked copy already landed', () => {
    const tabs = new Map([[base, [headers, copy('task-1', '')]]])
    const task = {
      kind: 'create' as const,
      ref: REF,
      values: { date: '2026-10-20', title: 'میوه', amount: 850000, category: 'خوراک' },
      split: 'equal' as const,
      payer: '',
      unlink: true
    }

    expect(run(task, tabs)).toBeNull()
  })

  it('writes the stable id into the id column of a new copy', () => {
    const op = run(
      {
        kind: 'create',
        ref: REF,
        values: { date: '2026-10-20', title: 'میوه', amount: 5 },
        split: '',
        payer: ''
      },
      new Map([[base, [headers]]])
    )

    expect(op && 'row' in op && op.row[0]).toBe('task-1')
  })
})

describe('an update with no typed title', () => {
  it('keeps the title the copy has now (a partner may have renamed it)', () => {
    const tabs = new Map([[base, [headers, copy('copy-1', REF, 'خرید هفتگی')]]])
    const op = run(
      {
        kind: 'update',
        ref: REF,
        values: { date: '2026-10-20', title: '', amount: 900000, category: 'خوراک' },
        split: '',
        payer: ''
      },
      tabs
    )
    const row = op && 'row' in op ? (op.row as string[]) : []

    expect(cell(row, 'عنوان')).toBe('خرید هفتگی')
    expect(cell(row, 'مبلغ')).toBe('900000')
  })
})
