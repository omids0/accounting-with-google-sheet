import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SheetsApiError } from './sheetsApi'
import { addOutboxEntry, getOutboxEntries } from './syncOutbox'

const { executeOutboxOperation } = vi.hoisted(() => ({ executeOutboxOperation: vi.fn() }))

vi.mock('./sheets', () => ({ executeOutboxOperation, isQuotaExceededError: () => false }))

vi.mock('./installments', () => ({ invalidateInstallmentsCache: vi.fn() }))

const SHEET_ID = 'sheet-held'

const sentTabs = () => executeOutboxOperation.mock.calls.map(call => call[1].sheetName)

describe('a failing write on the save queue', () => {
  beforeEach(() => {
    localStorage.clear()
    executeOutboxOperation.mockReset()
    addOutboxEntry(SHEET_ID, { type: 'append', sheetName: 'هزینه', row: ['1'] })
    addOutboxEntry(SHEET_ID, { type: 'append', sheetName: 'هزینه', row: ['2'] })
    addOutboxEntry(SHEET_ID, { type: 'append', sheetName: 'درآمد', row: ['3'] })
  })

  it('holds back only its own tab and lets the other tabs through', async () => {
    executeOutboxOperation.mockImplementation(async (_id: string, op: { sheetName: string }) => {
      if (op.sheetName === 'هزینه') throw new SheetsApiError('Internal error', 500)

      return op.sheetName
    })

    const { flushOutbox } = await import('./sheetSyncOutbox')

    expect(await flushOutbox(SHEET_ID)).toBe(false)
    // The second «هزینه» write waits behind the first; «درآمد» is not blocked by it.
    expect(sentTabs()).toEqual(['هزینه', 'درآمد'])
    expect(getOutboxEntries(SHEET_ID).map(entry => entry.operation.sheetName)).toEqual([
      'هزینه',
      'هزینه'
    ])
  })

  it('stops the whole pass when there is no answer at all', async () => {
    executeOutboxOperation.mockRejectedValue(new Error('Failed to fetch'))

    const { flushOutbox } = await import('./sheetSyncOutbox')

    expect(await flushOutbox(SHEET_ID)).toBe(false)
    expect(sentTabs()).toEqual(['هزینه'])
    expect(getOutboxEntries(SHEET_ID)).toHaveLength(3)
  })
})
