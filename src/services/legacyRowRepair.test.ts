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

const enqueue = vi.hoisted(() => vi.fn())

vi.mock('./sheetSync', () => ({ enqueueSheetWrite: enqueue }))
vi.mock('./settings', () => ({ getSettings: () => ({ forms: [EXPENSE] }) }))

const { buildHeaders } = await import('./sheetsHeaders')
const { findLegacyRows, repairLegacyRows, legacyRepairBlocker } = await import('./legacyRowRepair')
const { initStore, setSheetAllRows, getSheetAllRows } = await import('./spreadsheetStore')
const { addOutboxEntry, clearOutbox } = await import('./syncOutbox')

const ID = 'repair-sheet'

const HEADER = [...buildHeaders(FIELDS), 'ثبت‌کننده']

const LEGACY = ['L1', 't1', '2026-08-23', 'Cursor', '2000000', 'AI', 'note', 'Cursor']

const LEGACY_WITH_WRITER = [
  'L2',
  't2',
  '2026-10-15',
  'روغن',
  '5100000',
  'خودرو',
  '',
  'روغن موتور',
  '',
  'بله',
  '',
  'me@example.com'
]

const CURRENT = [
  'C1',
  't3',
  '2026-10-21',
  'QA',
  'سایر',
  '',
  '12345',
  '',
  'بله',
  '',
  '',
  '',
  'x@y.com'
]

describe('repairing legacy-layout rows', () => {
  beforeEach(() => {
    enqueue.mockReset()
    clearOutbox(ID)
    initStore(ID)
    setSheetAllRows(ID, 'هزینه', [HEADER, CURRENT, LEGACY, LEGACY_WITH_WRITER])
  })

  it('finds only the legacy rows, with their sheet row numbers', () => {
    const fixes = findLegacyRows(ID, [EXPENSE])

    expect(fixes.map(fix => [fix.sheetName, fix.rowNumber])).toEqual([
      ['هزینه', 3],
      ['هزینه', 4]
    ])
    expect(fixes[0].after.slice(0, 7)).toEqual([
      'L1',
      't1',
      '2026-08-23',
      'Cursor',
      'AI',
      'Cursor',
      '2000000'
    ])
    expect(fixes[0].after[11]).toBe('note')
    expect(fixes[1].after[12]).toBe('me@example.com')
    expect(fixes[1].after[11]).toBe('')
  })

  it('writes each row through the outbox with its old content as the guard, keeping the others', async () => {
    const fixes = findLegacyRows(ID, [EXPENSE])

    await expect(repairLegacyRows(ID, fixes)).resolves.toBe(2)

    expect(enqueue).toHaveBeenCalledTimes(2)

    const [, op] = enqueue.mock.calls[0]

    expect(op).toMatchObject({ type: 'update', sheetName: 'هزینه', rowNumber: 3 })
    expect(op.expectedRow).toEqual(LEGACY)
    expect(op.row[0]).toBe('L1')
    expect(op.row[1]).toBe('t1')
    expect(getSheetAllRows(ID, 'هزینه')?.[1]).toEqual(CURRENT)
    expect(getSheetAllRows(ID, 'هزینه')?.[2]).toEqual(fixes[0].after)
  })

  it('is idempotent: a second scan finds nothing and a second run writes nothing', async () => {
    await repairLegacyRows(ID, findLegacyRows(ID, [EXPENSE]))
    enqueue.mockClear()

    const again = findLegacyRows(ID, [EXPENSE])

    expect(again).toEqual([])
    await expect(repairLegacyRows(ID, again)).resolves.toBe(0)
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('ignores tabs without a header row and forms that are not income/expense', () => {
    setSheetAllRows(ID, 'هزینه', [LEGACY, LEGACY_WITH_WRITER])

    expect(findLegacyRows(ID, [EXPENSE])).toEqual([])
    expect(findLegacyRows(ID, [{ ...EXPENSE, type: 'custom' } as unknown as CustomForm])).toEqual(
      []
    )
  })

  it('refuses to start while edits are still queued', () => {
    expect(legacyRepairBlocker(ID)).toBeNull()
    addOutboxEntry(ID, { type: 'append', sheetName: 'هزینه', row: ['x'] })
    expect(legacyRepairBlocker(ID)).toContain('صف')
  })
})
