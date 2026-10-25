import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'

const { updateSheetRow } = vi.hoisted(() => ({ updateSheetRow: vi.fn() }))

vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async () => [],
  updateSheetRow: (...args: unknown[]) => updateSheetRow(...args),
  deleteSheetRow: vi.fn()
}))

const { updateRecord } = await import('./sheetsRecords')
const { initStore, setSheetAllRows } = await import('./spreadsheetStore')

const ID = 'sheet-1'
const HEADER = ['شناسه', 'زمان ثبت', 'تاریخ', 'مبلغ', 'حساب مشترک']

const form = (withLink: boolean): CustomForm => ({
  id: 'form_expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true },
    ...(withLink
      ? [{ id: 'sharedLink', label: 'حساب مشترک', type: 'text' as const, required: false }]
      : [])
  ]
})

/** The row `updateRecord` hands to the sheet writer. */
async function written(withLink: boolean, values: Record<string, string | number>) {
  await updateRecord(ID, form(withLink), 2, 'r1', 't', values)

  const builder = updateSheetRow.mock.calls[0][3] as () => string[]

  return builder()
}

describe('an edit keeps the link to the shared copy unless it sets it', () => {
  beforeEach(() => {
    updateSheetRow.mockReset()
    initStore(ID)
    setSheetAllRows(ID, 'هزینه', [HEADER, ['r1', 't', '2026-10-20', '5', 'shared-1']])
  })

  it('on a device without a shared account (no link field)', async () => {
    expect((await written(false, { date: '2026-10-21', amount: 6 }))[4]).toBe('shared-1')
  })

  it('on a path that passes its own values without the link (a vehicle edit)', async () => {
    expect((await written(true, { date: '2026-10-21', amount: 6 }))[4]).toBe('shared-1')
  })

  it('but an unticked save clears it', async () => {
    expect((await written(true, { date: '2026-10-21', amount: 6, sharedLink: '' }))[4]).toBe('')
  })
})
