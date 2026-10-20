import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ACTIVITY_SHEET } from './sheetNames'
import { RowConflictError } from './sheetsRowGuard'
import { addOutboxEntry, getFailedOutboxEntries, getOutboxEntries } from './syncOutbox'
import { getSyncStatus } from './syncStatus'

const { executeOutboxOperation } = vi.hoisted(() => ({ executeOutboxOperation: vi.fn() }))

vi.mock('./sheets', () => ({ executeOutboxOperation, isQuotaExceededError: () => false }))

vi.mock('./installments', () => ({ invalidateInstallmentsCache: vi.fn() }))

const SHEET_ID = 'sheet-activity'

describe('«فعالیت» writes', () => {
  beforeEach(() => {
    localStorage.clear()
    executeOutboxOperation.mockReset()
  })

  it('drops a refused write without parking it or raising an error', async () => {
    addOutboxEntry(SHEET_ID, {
      type: 'update',
      sheetName: ACTIVITY_SHEET,
      rowNumber: 2,
      row: ['2026-10-20', '2026-10-20']
    })
    executeOutboxOperation.mockRejectedValueOnce(new RowConflictError(ACTIVITY_SHEET))

    const { flushOutbox } = await import('./sheetSyncOutbox')

    await flushOutbox(SHEET_ID)

    expect(getOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(getSyncStatus().failedWrites).toBe(0)
    expect(getSyncStatus().syncState).not.toBe('error')
  })

  it('hides writes already parked by an older version', () => {
    localStorage.setItem(
      `accounting_sync_failed_${SHEET_ID}`,
      JSON.stringify([
        {
          id: 'old',
          spreadsheetId: SHEET_ID,
          createdAt: 1,
          attempts: 1,
          operation: { type: 'update', sheetName: ACTIVITY_SHEET, rowNumber: 2, row: ['a', 'b'] }
        }
      ])
    )

    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(0)
  })
})
