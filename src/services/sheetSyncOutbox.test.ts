import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SheetsApiError } from './sheetsApi'
import { RowConflictError } from './sheetsRowGuard'
import { addOutboxEntry, getFailedOutboxEntries, getOutboxEntries } from './syncOutbox'
import type { OutboxOperation } from './syncOutbox'

const { executeOutboxOperation } = vi.hoisted(() => ({ executeOutboxOperation: vi.fn() }))

vi.mock('./sheets', () => ({
  executeOutboxOperation,
  isQuotaExceededError: (err: unknown) =>
    err instanceof Error && 'status' in err && (err as { status: number }).status === 429
}))

vi.mock('./installments', () => ({ invalidateInstallmentsCache: vi.fn() }))

const SHEET_ID = 'sheet-1'

function op(title: string): OutboxOperation {
  return { type: 'append', sheetName: 'x', row: [title] }
}

describe('flushOutbox', () => {
  beforeEach(() => {
    localStorage.clear()
    executeOutboxOperation.mockReset()
  })

  it('parks a conflicting write and still sends the ones behind it', async () => {
    addOutboxEntry(SHEET_ID, op('a'))
    addOutboxEntry(SHEET_ID, op('b'))
    executeOutboxOperation
      .mockRejectedValueOnce(new RowConflictError('x'))
      .mockResolvedValueOnce(undefined)

    const { flushOutbox } = await import('./sheetSyncOutbox')

    await expect(flushOutbox(SHEET_ID)).resolves.toBe(true)
    expect(executeOutboxOperation).toHaveBeenCalledTimes(2)
    expect(getOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(getFailedOutboxEntries(SHEET_ID)).toHaveLength(1)
  })

  it('parks a request Google rejects for good instead of blocking sync forever', async () => {
    addOutboxEntry(SHEET_ID, op('a'))
    executeOutboxOperation.mockRejectedValueOnce(new SheetsApiError('Unable to parse range', 400))

    const { flushOutbox } = await import('./sheetSyncOutbox')

    await flushOutbox(SHEET_ID)
    expect(getOutboxEntries(SHEET_ID)).toHaveLength(0)
    expect(getFailedOutboxEntries(SHEET_ID)[0].lastError).toBe('Unable to parse range')
  })

  it('keeps a write that failed for a temporary reason and retries it later', async () => {
    addOutboxEntry(SHEET_ID, op('a'))
    addOutboxEntry(SHEET_ID, op('b'))
    executeOutboxOperation.mockRejectedValueOnce(new SheetsApiError('backend error', 503))

    const { flushOutbox } = await import('./sheetSyncOutbox')

    await expect(flushOutbox(SHEET_ID)).resolves.toBe(false)
    expect(executeOutboxOperation).toHaveBeenCalledTimes(1)
    expect(getOutboxEntries(SHEET_ID)).toHaveLength(2)
    expect(getOutboxEntries(SHEET_ID)[0].attempts).toBe(1)
  })

  it('marks the retry so an append that already landed is not duplicated', async () => {
    addOutboxEntry(SHEET_ID, op('a'))
    executeOutboxOperation
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(undefined)

    const { flushOutbox } = await import('./sheetSyncOutbox')

    await flushOutbox(SHEET_ID)
    await flushOutbox(SHEET_ID)

    expect(executeOutboxOperation.mock.calls[0][2]).toMatchObject({ isRetry: false })
    expect(executeOutboxOperation.mock.calls[1][2]).toMatchObject({ isRetry: true })
  })
})
