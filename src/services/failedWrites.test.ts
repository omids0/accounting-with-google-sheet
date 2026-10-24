import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RowConflictError } from './sheetsRowGuard'
import { appendSheetDataRow, getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import { addOutboxEntry, getFailedOutboxEntries, getOutboxEntries } from './syncOutbox'
import type { OutboxEntry } from './syncOutbox'

const { executeOutboxOperation } = vi.hoisted(() => ({ executeOutboxOperation: vi.fn() }))

vi.mock('./sheets', () => ({ executeOutboxOperation, isQuotaExceededError: () => false }))

vi.mock('./installments', () => ({ invalidateInstallmentsCache: vi.fn() }))

const SHEET_ID = 'sheet-failed'

const TAB = 'تراکنش‌ها'

const HEADER = ['شناسه', 'تاریخ', 'عنوان', 'مبلغ']

const KEPT = ['1', '1404/01/01', 'اجاره', '1000']

const ADDED = ['2', '1404/01/02', 'خرید', '25000']

/** A local append whose write Google then refuses for good. */
async function parkRejectedAppend(): Promise<OutboxEntry> {
  setSheetAllRows(SHEET_ID, TAB, [HEADER, KEPT])
  appendSheetDataRow(SHEET_ID, TAB, ADDED)
  addOutboxEntry(SHEET_ID, { type: 'append', sheetName: TAB, row: ADDED })
  executeOutboxOperation.mockRejectedValueOnce(new RowConflictError('x'))

  const { flushOutbox } = await import('./sheetSyncOutbox')

  await flushOutbox(SHEET_ID)

  return getFailedOutboxEntries(SHEET_ID)[0]
}

describe('failed sync writes', () => {
  beforeEach(() => {
    localStorage.clear()
    executeOutboxOperation.mockReset()
  })

  it('takes a refused write back out of the local mirror', async () => {
    const entry = await parkRejectedAppend()

    expect(entry.reverted).toBe(true)
    expect(getSheetAllRows(SHEET_ID, TAB)).toEqual([HEADER, KEPT])
  })

  it('«تلاش دوباره» shows the row again and sends it once more', async () => {
    const entry = await parkRejectedAppend()

    executeOutboxOperation.mockResolvedValueOnce(undefined)

    const { retryFailedWrite } = await import('./failedWrites')
    const { flushOutbox } = await import('./sheetSyncOutbox')

    expect(retryFailedWrite(SHEET_ID, entry.id)).toBe(true)
    expect(getSheetAllRows(SHEET_ID, TAB)).toEqual([HEADER, KEPT, ADDED])
    await flushOutbox(SHEET_ID)

    expect(executeOutboxOperation).toHaveBeenLastCalledWith(
      SHEET_ID,
      { type: 'append', sheetName: TAB, row: ADDED },
      { session: expect.anything(), isRetry: true }
    )
    expect(getOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(0)
  })

  it('«حذف» forgets one parked write and leaves the mirror as the sheet has it', async () => {
    const entry = await parkRejectedAppend()

    const { dismissFailedWrite } = await import('./failedWrites')

    dismissFailedWrite(SHEET_ID, entry.id)

    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(getOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(getSheetAllRows(SHEET_ID, TAB)).toEqual([HEADER, KEPT])
  })

  it('describes the parked write with its fields and a Persian cause', async () => {
    const { describeFailedWrite, formatFailedWriteDetails } = await import('./failedWrites')

    const summary = describeFailedWrite(
      {
        id: 'e1',
        spreadsheetId: SHEET_ID,
        createdAt: 0,
        attempts: 1,
        lastError: 'The caller does not have permission',
        operation: { type: 'delete', sheetName: TAB, rowNumber: 3, expectedRow: ADDED }
      },
      HEADER
    )

    expect(summary).toMatchObject({ action: 'حذف', title: 'خرید', date: '1404/01/02' })
    expect(summary.amount).toMatch(/۲۵/)
    expect(summary.cause).toMatch(/دسترسی ندارید/)
    expect(formatFailedWriteDetails(summary)).toContain('The caller does not have permission')
  })
})

describe('the failed queue clears itself and can be cleared by the user', () => {
  const GRID_ERROR =
    "Range ('دسته‌بندی‌ها'!A107:C) exceeds grid limits. Max rows: 106, max columns: 3"

  /** A refused replace of the categories tab, parked as an older build left it. */
  const parkReplace = async (error: string) => {
    const { moveOutboxEntryToFailed } = await import('./syncOutbox')

    const entry = addOutboxEntry(SHEET_ID, {
      type: 'replace',
      sheetName: 'دسته‌بندی‌ها',
      rows: [['a', 'b', '']],
      columnCount: 3
    })

    moveOutboxEntryToFailed(SHEET_ID, entry.id, error)
  }

  beforeEach(() => {
    localStorage.clear()
    executeOutboxOperation.mockReset()
  })

  it('retries a write parked by «exceeds grid limits» when the app starts', async () => {
    await parkReplace(GRID_ERROR)
    executeOutboxOperation.mockResolvedValue('دسته‌بندی‌ها')

    const { reviveGridLimitFailures } = await import('./failedWrites')
    const { flushOutbox } = await import('./sheetSyncOutbox')

    expect(reviveGridLimitFailures(SHEET_ID)).toBe(1)
    await flushOutbox(SHEET_ID)

    expect(executeOutboxOperation).toHaveBeenCalledTimes(1)
    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(getOutboxEntries(SHEET_ID)).toHaveLength(0)
  })

  it('leaves other parked writes alone at start', async () => {
    await parkReplace('Unable to parse range: Foo!A1')

    const { reviveGridLimitFailures } = await import('./failedWrites')

    expect(reviveGridLimitFailures(SHEET_ID)).toBe(0)
    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(1)
  })

  it('«دوباره بفرست» waits for the send and reports what is left', async () => {
    await parkReplace(GRID_ERROR)
    executeOutboxOperation.mockResolvedValue('دسته‌بندی‌ها')

    const { retryAllAndWait } = await import('./failedWrites')

    await expect(retryAllAndWait(SHEET_ID)).resolves.toEqual({ retried: 1, pending: 0, failed: 0 })
    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(0)
  })

  it('keeps counting a write that is refused again as failed', async () => {
    await parkReplace(GRID_ERROR)
    executeOutboxOperation.mockRejectedValue(new RowConflictError('x'))

    const { retryAllAndWait } = await import('./failedWrites')

    expect(await retryAllAndWait(SHEET_ID)).toEqual({ retried: 1, pending: 0, failed: 1 })
    expect(getFailedOutboxEntries(SHEET_ID)[0].attempts).toBeGreaterThan(1)
  })

  it('«حذف عملیات ناموفق» forgets every parked write', async () => {
    await parkReplace(GRID_ERROR)
    await parkReplace('another error')

    const { dismissAllFailedWrites } = await import('./failedWrites')

    expect(dismissAllFailedWrites(SHEET_ID)).toBe(2)
    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(0)
  })

  it('describes the sheet, the action and the attempts of a parked write', async () => {
    await parkReplace(GRID_ERROR)

    const { getFailedWriteSummaries } = await import('./failedWrites')

    expect(getFailedWriteSummaries(SHEET_ID)[0]).toMatchObject({
      sheetName: 'دسته‌بندی‌ها',
      action: 'بازنویسی برگه',
      attempts: 1
    })
  })
})
