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
vi.mock('./sheetRevisions', () => ({
  stampSheetRevisions: async (...args: unknown[]) => {
    stamped.push(args[1] as Set<string>)
    if (stampFails.value) throw new Error('stamp failed')
  },
  forgetSeenSheets: (...args: unknown[]) => {
    forgotten.push([...(args[1] as Iterable<string>)])
  }
}))
vi.mock('./sheetRemoteVersion', () => ({
  fetchRemoteModifiedTime: (...args: unknown[]) => driveTime(...args),
  rememberRemoteVersion: (...args: unknown[]) => remember(...args)
}))
vi.mock('./spreadsheetSyncMeta', () => ({
  getSyncMeta: () => ({ tokens: {}, modifiedTime: remembered(), fullSyncAt: 1 })
}))

const stamped: Set<string>[] = []

const forgotten: string[][] = []

const stampFails = { value: false }

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

describe('stamping the tab a write really landed in', () => {
  it('stamps the archive when a queued edit followed its row there', async () => {
    localStorage.clear()
    stamped.length = 0
    forgotten.length = 0
    driveTime.mockReset().mockResolvedValue('T1')
    remembered.mockReturnValue('T1')
    executeOutboxOperation.mockReset().mockResolvedValue('هزینه 1402')
    addOutboxEntry(ID, { type: 'update', sheetName: 'هزینه', rowNumber: 2, row: ['x'] })

    await flushOutbox(ID)

    expect([...stamped[0]]).toEqual(['هزینه 1402'])
    // Its local copy was not changed, so it must be downloaded again.
    expect(forgotten).toEqual([['هزینه 1402']])
  })
})

describe('a redirected write when stamping fails', () => {
  it('still marks the archive for download', async () => {
    localStorage.clear()
    stamped.length = 0
    forgotten.length = 0
    stampFails.value = true
    driveTime.mockReset().mockResolvedValue('T1')
    executeOutboxOperation.mockReset().mockResolvedValue('هزینه 1402')
    addOutboxEntry(ID, { type: 'update', sheetName: 'هزینه', rowNumber: 2, row: ['x'] })

    await flushOutbox(ID)
    stampFails.value = false

    expect(forgotten).toEqual([['هزینه 1402']])
  })
})
