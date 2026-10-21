import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readBridgePrefs, updateBridgePrefs } from './bridgePrefs'
import { bridgeReference, pocketReceivable } from './bridgeRows'
import { runBridgeSyncs, syncBridgedExpenseDelete, syncBridgedExpenseEdit } from './bridgeSync'
import { receivableToRow } from './receivablesRow'
import { RECEIVABLES_SHEET } from './sheetNames'
import { addOutboxEntry } from './syncOutbox'

const { writeToWorkspace, drainWorkspace, batchFetch } = vi.hoisted(() => ({
  writeToWorkspace: vi.fn(async (_id: string, _operation: unknown) => true),
  drainWorkspace: vi.fn(async () => true),
  batchFetch: vi.fn()
}))

vi.mock('./workspaceBridge', () => ({ writeToWorkspace, drainWorkspace }))
vi.mock('./sheetsRows', () => ({ batchFetchSheetRangesFromApi: batchFetch }))

const PERSONAL = 'personal-1'

const receivable = pocketReceivable({
  recordId: 'rec-1',
  building: 'ساختمان نرگس',
  title: 'سرویس',
  amount: 2_400_000,
  date: '2025-10-02',
  email: ''
})

const EDITED = { title: 'سرویس کامل', amount: 3_000_000, date: '2025-10-09', category: 'آسانسور' }

const readable = () =>
  batchFetch.mockResolvedValue(
    new Map([[RECEIVABLES_SHEET, [['شناسه'], receivableToRow(receivable)]]])
  )

beforeEach(() => {
  localStorage.clear()
  writeToWorkspace.mockReset()
  writeToWorkspace.mockResolvedValue(true)
  drainWorkspace.mockReset()
  drainWorkspace.mockResolvedValue(true)
  batchFetch.mockReset()
  readable()
  updateBridgePrefs({ sent: { 'rec-1': PERSONAL } })
})

describe('syncBridgedExpenseEdit', () => {
  it('queues the update of the bridged receivable in the personal spreadsheet', async () => {
    await syncBridgedExpenseEdit('rec-1', EDITED)

    expect(writeToWorkspace).toHaveBeenCalledTimes(1)

    const [target, operation] = writeToWorkspace.mock.calls[0] as unknown as [
      string,
      { type: string; sheetName: string; row: string[] }
    ]

    expect(target).toBe(PERSONAL)
    expect(operation).toMatchObject({ type: 'update', sheetName: RECEIVABLES_SHEET })
    expect(operation.row[2]).toBe('سرویس کامل · ساختمان نرگس')
    expect(operation.row[5]).toBe('3000000')
    expect(readBridgePrefs().syncs).toEqual([])
  })

  it('ignores an expense that was never bridged', async () => {
    await syncBridgedExpenseEdit('rec-9', EDITED)

    expect(batchFetch).not.toHaveBeenCalled()
    expect(writeToWorkspace).not.toHaveBeenCalled()
  })

  it('stays queued while the personal sheet cannot be read, then goes out on the next run', async () => {
    batchFetch.mockRejectedValueOnce(new Error('offline'))

    await syncBridgedExpenseEdit('rec-1', EDITED)

    expect(writeToWorkspace).not.toHaveBeenCalled()
    expect(readBridgePrefs().syncs).toHaveLength(1)

    await runBridgeSyncs()

    expect(writeToWorkspace).toHaveBeenCalledTimes(1)
    expect(readBridgePrefs().syncs).toEqual([])
  })

  it('keeps only the newest edit of an expense while offline', async () => {
    batchFetch.mockRejectedValue(new Error('offline'))

    await syncBridgedExpenseEdit('rec-1', EDITED)
    await syncBridgedExpenseEdit('rec-1', { ...EDITED, amount: 3_500_000 })

    expect(readBridgePrefs().syncs.map(task => task.amount)).toEqual([3_500_000])
  })

  it("waits for the receivable's own append to leave the personal outbox first", async () => {
    addOutboxEntry(PERSONAL, {
      type: 'append',
      sheetName: RECEIVABLES_SHEET,
      row: Array.from({ length: 12 }, (_, i) => (i === 11 ? bridgeReference('rec-1') : ''))
    })
    drainWorkspace.mockResolvedValue(false)

    await syncBridgedExpenseEdit('rec-1', EDITED)

    expect(batchFetch).not.toHaveBeenCalled()
    expect(readBridgePrefs().syncs).toHaveLength(1)
  })
})

describe('syncBridgedExpenseDelete', () => {
  it('queues the delete of an unpaid receivable and forgets the expense', async () => {
    await syncBridgedExpenseDelete('rec-1')

    expect(writeToWorkspace).toHaveBeenCalledWith(
      PERSONAL,
      expect.objectContaining({ type: 'delete', sheetName: RECEIVABLES_SHEET, rowNumber: 2 })
    )
    expect(readBridgePrefs().sent).toEqual({})
    expect(readBridgePrefs().syncs).toEqual([])
  })

  it('a delete replaces an edit that has not been sent yet', async () => {
    batchFetch.mockRejectedValueOnce(new Error('offline'))
    await syncBridgedExpenseEdit('rec-1', EDITED)

    await syncBridgedExpenseDelete('rec-1')

    expect(writeToWorkspace).toHaveBeenCalledTimes(1)
    expect(writeToWorkspace.mock.calls[0][1]).toMatchObject({ type: 'delete' })
    expect(readBridgePrefs().syncs).toEqual([])
  })

  it('does nothing for an expense that was never bridged', async () => {
    await syncBridgedExpenseDelete('rec-9')

    expect(writeToWorkspace).not.toHaveBeenCalled()
  })
})
