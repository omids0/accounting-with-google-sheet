import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomForm } from '../types'

const { updateSheetRow, deleteSheetRow } = vi.hoisted(() => ({
  updateSheetRow: vi.fn(),
  deleteSheetRow: vi.fn()
}))

const EXPENSE: CustomForm = {
  id: 'form_expense',
  name: 'هزینه',
  sheetName: 'هزینه',
  type: 'expense',
  fields: [
    { id: 'date', label: 'تاریخ', type: 'date', required: true },
    { id: 'amount', label: 'مبلغ', type: 'number', required: true }
  ]
}

vi.mock('./sheetsRows', () => ({
  fetchSheetRangeFromApi: async () => [],
  updateSheetRow: (...args: unknown[]) => updateSheetRow(...args),
  deleteSheetRow: (...args: unknown[]) => deleteSheetRow(...args)
}))
vi.mock('./settings', () => ({ getSettings: () => ({ forms: [EXPENSE] }) }))

const { fetchRecords, updateRecord, deleteRecord } = await import('./sheetsRecords')
const { initStore, setSheetAllRows } = await import('./spreadsheetStore')
const { updateSyncMeta } = await import('./spreadsheetSyncMeta')

const ID = 'sheet-1'

const HEADER = ['شناسه', 'زمان ثبت', 'تاریخ', 'مبلغ']

describe('records across a form tab and its archives', () => {
  beforeEach(() => {
    updateSheetRow.mockReset()
    deleteSheetRow.mockReset()
    initStore(ID)
    setSheetAllRows(ID, 'هزینه', [
      HEADER,
      ['new', 't', '2025-06-01', '10'],
      ['dup', 't', '2025-06-02', '99']
    ])
    setSheetAllRows(ID, 'هزینه 1402', [
      HEADER,
      ['old', 't', '2023-06-01', '20'],
      ['dup', 't', '2023-06-02', '1']
    ])
    setSheetAllRows(ID, 'شیت دیگر 1402', [HEADER, ['alien', 't', '2023-06-01', '5']])
    // A hand-made backup tab with an archive-like name and no app marker.
    setSheetAllRows(ID, 'هزینه 1401', [
      HEADER,
      ['backup', 't', '2022-06-01', '3'],
      ['dup', 't', '2022-06-02', '4']
    ])
    updateSyncMeta(ID, { archiveTabs: ['هزینه 1402'] })
  })

  it('returns base and archive rows, tagged with their tab, the base copy winning', async () => {
    const records = await fetchRecords(ID, EXPENSE)

    expect(records.map(r => [r.id, r.sheetName, r.rowNumber])).toEqual([
      ['new', 'هزینه', 2],
      ['dup', 'هزینه', 3],
      ['old', 'هزینه 1402', 2]
    ])
    expect(records.find(r => r.id === 'dup')?.values.amount).toBe('99')
  })

  it('writes an edit or delete to the tab the record lives in', async () => {
    const old = (await fetchRecords(ID, EXPENSE)).find(r => r.id === 'old')!

    await updateRecord(
      ID,
      EXPENSE,
      old.rowNumber,
      old.id,
      old.createdAt,
      { amount: 30 },
      old.sheetName
    )
    await deleteRecord(ID, EXPENSE, old.rowNumber, old.sheetName)

    expect(updateSheetRow.mock.calls[0].slice(1, 3)).toEqual(['هزینه 1402', 2])
    expect(deleteSheetRow).toHaveBeenCalledWith(ID, 'هزینه 1402', 2)
  })

  it('keeps writing to the base tab when no tab is given', async () => {
    await deleteRecord(ID, EXPENSE, 3)

    expect(deleteSheetRow).toHaveBeenCalledWith(ID, 'هزینه', 3)
  })
})

describe('deleting a record held in two tabs', () => {
  it('deletes every copy, so the archived one cannot come back', async () => {
    deleteSheetRow.mockReset()
    initStore(ID)
    updateSyncMeta(ID, { archiveTabs: ['هزینه 1402'] })
    setSheetAllRows(ID, 'هزینه', [
      HEADER,
      ['new', 't', '2025-06-01', '10'],
      ['dup', 't', '2023-06-02', '99']
    ])
    setSheetAllRows(ID, 'هزینه 1402', [
      HEADER,
      ['old', 't', '2023-06-01', '20'],
      ['dup', 't', '2023-06-02', '1']
    ])

    await deleteRecord(ID, EXPENSE, 3, 'هزینه')

    expect(deleteSheetRow.mock.calls.map(call => call.slice(1))).toEqual([
      ['هزینه', 3],
      ['هزینه 1402', 3]
    ])
  })
})

describe('tabs named like archives but not created by the app', () => {
  it('are neither read nor touched by a delete', async () => {
    deleteSheetRow.mockReset()
    initStore(ID)
    setSheetAllRows(ID, 'هزینه', [HEADER, ['dup', 't', '2025-06-02', '99']])
    setSheetAllRows(ID, 'هزینه 1401', [HEADER, ['dup', 't', '2022-06-02', '4']])
    updateSyncMeta(ID, { archiveTabs: [] })

    const records = await fetchRecords(ID, EXPENSE)

    expect(records.map(r => r.sheetName)).toEqual(['هزینه'])

    await deleteRecord(ID, EXPENSE, 2, 'هزینه')

    expect(deleteSheetRow.mock.calls.map(call => call[1])).toEqual(['هزینه'])
  })
})
