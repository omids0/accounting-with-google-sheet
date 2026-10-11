import { beforeEach, describe, expect, it, vi } from 'vitest'

import { addOutboxEntry } from './syncOutbox'

const { executeOutboxOperation, driveTime, remember, remembered } = vi.hoisted(() => ({
  executeOutboxOperation: vi.fn(),
  driveTime: vi.fn(),
  remember: vi.fn(),
  remembered: vi.fn()
}))

vi.mock('./sheets', () => ({
  executeOutboxOperation,
  isQuotaExceededError: () => false
}))
vi.mock('./installments', () => ({ invalidateInstallmentsCache: vi.fn() }))
vi.mock('./sheetRevisions', () => ({ stampSheetRevisions: async () => undefined }))
vi.mock('./sheetRemoteVersion', () => ({
  fetchRemoteModifiedTime: (...args: unknown[]) => driveTime(...args),
  rememberRemoteVersion: (...args: unknown[]) => remember(...args)
}))
vi.mock('./spreadsheetSyncMeta', () => ({
  getSyncMeta: () => ({ tokens: {}, modifiedTime: remembered(), fullSyncAt: 1 })
}))

const { flushOutbox } = await import('./sheetSyncOutbox')

const ID = 'sheet-1'

describe('announcing own writes', () => {
  beforeEach(() => {
    localStorage.clear()
    executeOutboxOperation.mockReset().mockResolvedValue(undefined)
    driveTime.mockReset()
    remember.mockReset()
    remembered.mockReset().mockReturnValue('T1')
    addOutboxEntry(ID, { type: 'append', sheetName: 'هزینه', row: ['1'] })
  })

  it('treats the new Drive time as its own when nothing else changed before the flush', async () => {
    driveTime.mockResolvedValueOnce('T1').mockResolvedValueOnce('T2')

    await flushOutbox(ID)

    expect(remember).toHaveBeenCalledWith(ID, 'T2')
  })

  it('keeps the old Drive time when the sheet changed before the flush (hand edit)', async () => {
    driveTime.mockResolvedValueOnce('T5').mockResolvedValueOnce('T6')

    await flushOutbox(ID)

    expect(remember).not.toHaveBeenCalled()
  })

  it('keeps the old Drive time when Drive could not be read before the flush', async () => {
    driveTime.mockResolvedValueOnce(null).mockResolvedValueOnce('T6')

    await flushOutbox(ID)

    expect(remember).not.toHaveBeenCalled()
  })
})
