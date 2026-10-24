import { describe, expect, it } from 'vitest'

import { bridgeReference, pocketReceivable } from './bridgeRows'
import { BRIDGE_DELETED_NOTE, BRIDGE_FLOOR_NOTE, bridgeSyncOperation } from './bridgeSyncRows'
import { receivableToRow, rowToReceivable } from './receivablesRow'
import { RECEIVABLES_SHEET } from './sheetNames'

const base = pocketReceivable({
  recordId: 'rec-1',
  building: 'ساختمان نرگس',
  title: 'سرویس آسانسور',
  amount: 2_400_000,
  date: '2025-10-02',
  email: ''
})

const sheet = (paid = 0, extra: string[][] = []) => [
  ['شناسه'],
  ...extra,
  receivableToRow({
    ...base,
    payments: paid ? [{ id: 'p1', amount: paid, paidAt: '2025-10-12', note: '' }] : []
  })
]

const edit = (amount: number, rows: string[][], title = 'سرویس آسانسور', date = '2025-10-02') =>
  bridgeSyncOperation({
    kind: 'edit',
    recordId: 'rec-1',
    title,
    amount,
    date,
    receivableRows: rows
  })

const del = (rows: string[][]) =>
  bridgeSyncOperation({
    kind: 'delete',
    recordId: 'rec-1',
    title: '',
    amount: 0,
    date: '',
    receivableRows: rows
  })

const rowOf = (operation: unknown) => (operation as { row: string[] }).row

describe('bridgeSyncOperation: edit', () => {
  it('updates an unpaid receivable in place with the new amount, title and date', () => {
    const op = edit(3_000_000, sheet(), 'سرویس کامل', '2025-10-05')

    expect(op).toMatchObject({ type: 'update', sheetName: RECEIVABLES_SHEET, rowNumber: 2 })

    const next = rowToReceivable(rowOf(op), 2)

    expect(next).toMatchObject({
      id: base.id,
      title: 'سرویس کامل · ساختمان نرگس',
      debtor: 'ساختمان نرگس',
      amount: 3_000_000,
      borrowDate: '2025-10-05',
      reference: bridgeReference('rec-1')
    })
    expect(next.note).toBe(base.note)
  })

  it('finds the row wherever it is and numbers it for the sheet', () => {
    expect(edit(3_000_000, sheet(0, [['x', 'y'], ['z']]))).toMatchObject({
      type: 'update',
      rowNumber: 4
    })
  })

  it('writes nothing when the receivable already says the same', () => {
    expect(edit(2_400_000, sheet())).toBeNull()
  })

  it('never shrinks below what was paid, and says so in the note', () => {
    const next = rowToReceivable(rowOf(edit(1_000_000, sheet(1_800_000))), 2)

    expect(next.amount).toBe(1_800_000)
    expect(next.payments).toHaveLength(1)
    expect(next.note).toBe(`${base.note} · ${BRIDGE_FLOOR_NOTE}`)
  })

  it('takes the floor note away again once the amount is above the payments', () => {
    const shrunk = rowOf(edit(1_000_000, sheet(1_800_000)))

    const op = edit(2_500_000, [['شناسه'], shrunk])

    expect(rowToReceivable(rowOf(op), 2).note).toBe(base.note)
  })

  it('carries the row as read, so a change made elsewhere meanwhile is a conflict', () => {
    const rows = sheet()

    expect((edit(3_000_000, rows) as { expectedRow: string[] }).expectedRow).toEqual(rows[1])
  })

  it('does nothing when the receivable is gone', () => {
    expect(edit(3_000_000, [['شناسه']])).toBeNull()
  })
})

describe('bridgeSyncOperation: delete', () => {
  it('deletes an unpaid receivable', () => {
    expect(del(sheet())).toMatchObject({
      type: 'delete',
      sheetName: RECEIVABLES_SHEET,
      rowNumber: 2
    })
  })

  it('keeps a paid receivable and marks it «هزینه حذف شد»', () => {
    const op = del(sheet(500_000))

    expect(op).toMatchObject({ type: 'update', rowNumber: 2 })

    const next = rowToReceivable(rowOf(op), 2)

    expect(next.amount).toBe(2_400_000)
    expect(next.payments).toHaveLength(1)
    expect(next.note).toBe(`${base.note} · ${BRIDGE_DELETED_NOTE}`)
  })

  it('does not mark twice', () => {
    const marked = rowOf(del(sheet(500_000)))

    expect(del([['شناسه'], marked])).toBeNull()
  })

  it('does nothing when the receivable is gone', () => {
    expect(del([['شناسه']])).toBeNull()
  })
})
