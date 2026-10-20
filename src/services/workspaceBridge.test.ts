import { beforeEach, describe, expect, it, vi } from 'vitest'

import { pendingBridgeChanges, updateBridgePrefs } from './bridgePrefs'
import { getDefaultSettings, saveSettings } from './settings'
import { RECEIVABLES_SHEET } from './sheetNames'
import { SheetsApiError } from './sheetsApi'
import { getStore } from './spreadsheetStore'
import { getFailedOutboxEntries, getOutboxEntries } from './syncOutbox'
import type { OutboxOperation } from './syncOutbox'
import { drainBridgeWorkspaces, drainWorkspace, writeToWorkspace } from './workspaceBridge'

const { executeOutboxOperation, announceWrites, ensureManySheetsWithHeaders } = vi.hoisted(() => ({
  executeOutboxOperation: vi.fn(),
  announceWrites: vi.fn(async () => undefined),
  ensureManySheetsWithHeaders: vi.fn(async () => undefined)
}))

vi.mock('./sheets', () => ({ executeOutboxOperation, isQuotaExceededError: () => false }))
vi.mock('./sheetSyncAnnounce', () => ({ announceWrites, readDriveTime: async () => null }))
vi.mock('./sheetsEnsure', () => ({ ensureManySheetsWithHeaders }))

const BUILDING = 'building-1'

const PERSONAL = 'personal-1'

const append: OutboxOperation = {
  type: 'append',
  sheetName: RECEIVABLES_SHEET,
  row: ['bridge-r1', '', 'سرویس آسانسور', 'ساختمان نرگس']
}

function openBuilding(): void {
  saveSettings({
    ...getDefaultSettings(),
    spreadsheetId: BUILDING,
    spreadsheets: [
      { id: PERSONAL, name: 'حسابداری · شخصی', createdAt: '' },
      { id: BUILDING, name: 'حسابداری · ساختمان نرگس', createdAt: '', kind: 'building' }
    ]
  })
}

beforeEach(() => {
  localStorage.clear()
  executeOutboxOperation.mockReset()
  executeOutboxOperation.mockImplementation(
    async (_id: string, op: OutboxOperation) => op.sheetName
  )
  announceWrites.mockClear()
  ensureManySheetsWithHeaders.mockClear()
  openBuilding()
})

describe('writeToWorkspace', () => {
  it('queues in the target spreadsheet outbox and sends it without switching', async () => {
    const sent = await writeToWorkspace(PERSONAL, append)

    expect(sent).toBe(true)
    // Sent to the personal spreadsheet by id, not through the open building's mirror.
    expect(executeOutboxOperation).toHaveBeenCalledWith(PERSONAL, append, expect.anything())
    expect(getOutboxEntries(PERSONAL)).toHaveLength(0)
    expect(getOutboxEntries(BUILDING)).toHaveLength(0)
  })

  it('never loads the target into the single in-memory mirror', async () => {
    await writeToWorkspace(PERSONAL, append)

    expect(getStore(PERSONAL)).toBeNull()
  })

  it('creates a missing tab the bridge writes to before sending', async () => {
    await writeToWorkspace(PERSONAL, append)

    expect(ensureManySheetsWithHeaders).toHaveBeenCalledWith(PERSONAL, [
      expect.objectContaining({ sheetName: RECEIVABLES_SHEET })
    ])
  })

  it('stamps the change tokens of the target so its next pull downloads the tab', async () => {
    await writeToWorkspace(PERSONAL, append)

    expect(announceWrites).toHaveBeenCalledWith(PERSONAL, new Set([RECEIVABLES_SHEET]), null)
  })

  it('keeps a write that cannot be sent queued in the target and does not throw', async () => {
    executeOutboxOperation.mockRejectedValueOnce(new SheetsApiError('server', 503))

    await expect(writeToWorkspace(PERSONAL, append)).resolves.toBe(false)

    expect(getOutboxEntries(PERSONAL)).toHaveLength(1)
    expect(getOutboxEntries(PERSONAL)[0].attempts).toBe(1)
    expect(pendingBridgeChanges(PERSONAL)).toBe(1)
    expect(pendingBridgeChanges(BUILDING)).toBe(0)
  })

  it('sends the queued write on the next drain (back online, next start)', async () => {
    executeOutboxOperation.mockRejectedValueOnce(new SheetsApiError('server', 503))
    await writeToWorkspace(PERSONAL, append)

    await drainBridgeWorkspaces()

    expect(getOutboxEntries(PERSONAL)).toHaveLength(0)
    // The retry checks that the append did not land after all.
    expect(executeOutboxOperation).toHaveBeenLastCalledWith(
      PERSONAL,
      append,
      expect.objectContaining({ isRetry: true })
    )
  })

  it('keeps a write the sheet refuses queued for that workspace, and stops retrying it', async () => {
    executeOutboxOperation.mockRejectedValue(new SheetsApiError('bad range', 400))

    await writeToWorkspace(PERSONAL, append)
    for (let i = 0; i < 8; i += 1) await drainBridgeWorkspaces()

    // Still there (reported in the switcher); opening the workspace lets the normal flush park it.
    expect(getOutboxEntries(PERSONAL)).toHaveLength(1)
    expect(getFailedOutboxEntries(PERSONAL)).toHaveLength(0)
    expect(executeOutboxOperation).toHaveBeenCalledTimes(5)
    expect(pendingBridgeChanges(PERSONAL)).toBe(1)
  })

  it('holds back only the later writes of the tab that failed', async () => {
    executeOutboxOperation.mockRejectedValueOnce(new SheetsApiError('bad range', 400))

    const sameTab: OutboxOperation = { ...append, row: ['bridge-r2'] }

    const otherTab: OutboxOperation = { type: 'append', sheetName: 'گردش حساب', row: ['l1'] }

    await writeToWorkspace(PERSONAL, [append, sameTab, otherTab])

    expect(executeOutboxOperation).toHaveBeenCalledTimes(2)
    expect(getOutboxEntries(PERSONAL).map(entry => entry.operation)).toEqual([append, sameTab])
  })

  it('stops at the first write that cannot go, so the order is kept', async () => {
    executeOutboxOperation.mockRejectedValueOnce(new SheetsApiError('server', 500))

    const second: OutboxOperation = { ...append, row: ['bridge-r2'] }

    await writeToWorkspace(PERSONAL, [append, second])

    expect(executeOutboxOperation).toHaveBeenCalledTimes(1)
    expect(getOutboxEntries(PERSONAL)).toHaveLength(2)
  })

  it('stays queued while offline', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    await expect(writeToWorkspace(PERSONAL, append)).resolves.toBe(false)

    expect(executeOutboxOperation).not.toHaveBeenCalled()
    expect(getOutboxEntries(PERSONAL)).toHaveLength(1)
    online.mockRestore()
  })

  it('goes through the normal outbox when the target is the open workspace', async () => {
    saveSettings({ ...getDefaultSettings(), spreadsheetId: PERSONAL })

    await writeToWorkspace(PERSONAL, append)
    await drainWorkspace(PERSONAL)

    expect(announceWrites).toHaveBeenCalled()
    expect(executeOutboxOperation).toHaveBeenCalledWith(PERSONAL, append, expect.anything())
  })
})

describe('drainBridgeWorkspaces', () => {
  it('skips the open workspace: its own flush owns that outbox', async () => {
    localStorage.setItem(
      `accounting_sync_outbox_${BUILDING}`,
      JSON.stringify([
        { id: 'a', spreadsheetId: BUILDING, createdAt: 0, operation: append, attempts: 0 }
      ])
    )

    await drainBridgeWorkspaces()

    expect(executeOutboxOperation).not.toHaveBeenCalled()
  })

  it('counts bridged payments still waiting for the personal sheet', () => {
    updateBridgePrefs({
      payments: [
        { id: 'p1', personalId: PERSONAL, recordId: 'r1', amount: 1, date: '', account: '' }
      ]
    })

    expect(pendingBridgeChanges(PERSONAL)).toBe(1)
  })
})
