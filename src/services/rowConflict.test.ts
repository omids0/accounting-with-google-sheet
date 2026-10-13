import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  detectRowConflict,
  diffCells,
  RowEditConflictError,
  rowSummary,
  rowTitle
} from './rowConflict'
import { addOutboxEntry, getConflictEntries, getOutboxCount, getOutboxEntries } from './syncOutbox'

const { executeOutboxOperation, logActivity } = vi.hoisted(() => ({
  executeOutboxOperation: vi.fn(),
  logActivity: vi.fn()
}))

vi.mock('./sheets', () => ({ executeOutboxOperation, isQuotaExceededError: () => false }))
vi.mock('./installments', () => ({ invalidateInstallmentsCache: vi.fn() }))
vi.mock('./activityLog', () => ({ logActivity }))

const ME = 'me@example.com'
const SARA = 'sara@example.com'
const W = 3
const SHEET_ID = 'sheet-conflicts'

const base = ['r1', 't', '100', ME]
const mine = ['r1', 't', '150', ME]

describe('detectRowConflict', () => {
  it('needs a base row', () => {
    expect(detectRowConflict(undefined, ['r1', 't', '9', SARA], mine, ME, W)).toBe('none')
  })

  it('ignores a row nobody changed or that already equals mine', () => {
    expect(detectRowConflict(base, [...base], mine, ME, W)).toBe('none')
    expect(detectRowConflict(base, [...mine], mine, ME, W)).toBe('none')
  })

  it('ignores tabs without a writer column and rows from older apps or my devices', () => {
    expect(detectRowConflict(base, ['r1', 't', '9', SARA], mine, ME, -1)).toBe('none')
    expect(detectRowConflict(base, ['r1', 't', '9', ''], mine, ME, W)).toBe('none')
    expect(detectRowConflict(base, ['r1', 't', '9', 'ME@example.com'], mine, ME, W)).toBe('none')
  })

  it('asks when another account changed the row', () => {
    expect(detectRowConflict(base, ['r1', 't', '9', SARA], mine, ME, W)).toBe('conflict')
  })
})

describe('row text helpers', () => {
  const headers = ['شناسه', 'زمان ثبت', 'عنوان', 'دسته‌بندی', 'مبلغ', 'زیردسته', 'ثبت‌کننده']

  it('diffs labelled cells and leaves out the writer', () => {
    expect(
      diffCells(
        headers,
        ['r1', 't', 'یخچال', 'خانه', '2350000', 'تعمیر', ME],
        ['r1', 't', 'یخچال', 'خانه', '2400000', 'تعمیر', SARA]
      )
    ).toEqual([{ label: 'مبلغ', mine: '2350000', theirs: '2400000' }])
  })

  it('names and summarises a row', () => {
    const row = ['r1', 't', 'تعمیر یخچال', 'خانه', '2400000', 'تعمیر', SARA]

    expect(rowTitle(headers, row)).toBe('تعمیر یخچال')
    expect(rowSummary(headers, row)).toBe('مبلغ ۲٬۴۰۰٬۰۰۰ · دسته خانه › تعمیر')
  })
})

describe('parked conflicts', () => {
  beforeEach(() => {
    localStorage.clear()
    executeOutboxOperation.mockReset()
    logActivity.mockReset()
  })

  const update = { type: 'update' as const, sheetName: 'هزینه', rowNumber: 2, row: mine }

  it('parks the update and skips it on the next pass', async () => {
    addOutboxEntry(SHEET_ID, { ...update, expectedRow: base })
    executeOutboxOperation.mockRejectedValueOnce(
      new RowEditConflictError(['r1', 't', '9', SARA], SARA, '')
    )

    const { flushOutbox } = await import('./sheetSyncOutbox')

    await flushOutbox(SHEET_ID)
    expect(getConflictEntries(SHEET_ID)).toHaveLength(1)
    expect(getOutboxCount(SHEET_ID)).toBe(0)

    await flushOutbox(SHEET_ID)
    expect(executeOutboxOperation).toHaveBeenCalledTimes(1)
  })

  it('keeps theirs: drops my write and logs one line', async () => {
    addOutboxEntry(SHEET_ID, { ...update, expectedRow: base })
    executeOutboxOperation.mockRejectedValueOnce(
      new RowEditConflictError(['r1', 't', '9', SARA], SARA, '')
    )

    const { flushOutbox } = await import('./sheetSyncOutbox')
    const { keepTheirVersion, listRowConflicts } = await import('./rowConflictResolve')

    await flushOutbox(SHEET_ID)
    keepTheirVersion(SHEET_ID, listRowConflicts(SHEET_ID)[0])

    expect(getOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(logActivity).toHaveBeenCalledTimes(1)
    expect(logActivity.mock.calls[0][1].summary).toContain('نسخهٔ خود')
  })

  it('keeps mine: sends my row over theirs', async () => {
    const theirs = ['r1', 't', '9', SARA]

    addOutboxEntry(SHEET_ID, { ...update, expectedRow: base })
    executeOutboxOperation.mockRejectedValueOnce(new RowEditConflictError(theirs, SARA, ''))

    const { flushOutbox } = await import('./sheetSyncOutbox')
    const { keepMyVersion, listRowConflicts } = await import('./rowConflictResolve')

    await flushOutbox(SHEET_ID)
    executeOutboxOperation.mockResolvedValue('هزینه')
    keepMyVersion(SHEET_ID, listRowConflicts(SHEET_ID)[0], 'سارا')
    await vi.waitFor(() => expect(getOutboxEntries(SHEET_ID)).toHaveLength(0))

    const sent = executeOutboxOperation.mock.calls[1][1]

    expect(sent.expectedRow).toEqual(theirs)
    expect(sent.row).toEqual(mine)
    expect(logActivity.mock.calls[0][1].summary).toContain('نسخهٔ سارا')
  })
})
