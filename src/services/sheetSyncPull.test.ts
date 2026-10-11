import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppSettings } from '../types'

const remote = vi.fn()
const revisionsFetch = vi.fn()
const findChanged = vi.fn()
const batchFetch = vi.fn()
const remember = vi.fn()

vi.mock('./sheetRemoteVersion', () => ({
  checkRemoteChanged: (...args: unknown[]) => remote(...args),
  rememberRemoteVersion: (...args: unknown[]) => remember(...args)
}))
vi.mock('./sheetRevisions', () => ({
  fetchSheetRevisions: (...args: unknown[]) => revisionsFetch(...args),
  findChangedSheets: (...args: unknown[]) => findChanged(...args),
  markSheetsSeen: vi.fn()
}))
vi.mock('./sheets', () => ({
  batchFetchSheetRangesFromApi: (...args: unknown[]) => batchFetch(...args)
}))
vi.mock('./sheetSyncOutbox', () => ({
  invalidateDerivedCaches: vi.fn(),
  reviveMissingTabAppends: () => new Map()
}))
vi.mock('./sheetSyncSheetNames', () => ({ getKnownSheetNames: () => ['هزینه', 'درآمد'] }))

const { pullRemoteSheets } = await import('./sheetSyncPull')
const { initStore, getSheetAllRows, setSheetAllRows } = await import('./spreadsheetStore')
const { addOutboxEntry, clearOutbox } = await import('./syncOutbox')
const { getSyncMeta, updateSyncMeta } = await import('./spreadsheetSyncMeta')

const ID = 'sheet-1'

const SETTINGS = {} as AppSettings

function fetchedTabs(): string[] | null {
  return batchFetch.mock.calls.length ? batchFetch.mock.calls[0][1] : null
}

describe('pullRemoteSheets', () => {
  beforeEach(() => {
    remote.mockReset().mockResolvedValue({ driveChanged: false, modifiedTime: 'T1' })
    revisionsFetch.mockReset().mockResolvedValue(new Map())
    findChanged.mockReset().mockReturnValue([])
    batchFetch.mockReset().mockImplementation(async (_id: string, names: string[]) => {
      return new Map(names.map(name => [name, [['شناسه'], [name]]]))
    })
    localStorage.clear()
    remember.mockReset()
    initStore(ID)
    updateSyncMeta(ID, { fullSyncAt: Date.now() })
  })

  it('downloads nothing when no token moved and Drive is unchanged', async () => {
    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(batchFetch).not.toHaveBeenCalled()
  })

  it('still records the check as a sync when nothing needed downloading', async () => {
    const { getStoreLastSyncedAt } = await import('./spreadsheetStore')
    const before = Date.now()

    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(getStoreLastSyncedAt(ID)).toBeGreaterThanOrEqual(before)
  })

  it('downloads only the tab whose token moved', async () => {
    findChanged.mockReturnValue(['هزینه'])

    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(fetchedTabs()).toEqual(['هزینه'])
  })

  it('downloads every tab when Drive changed without a token and resets the daily net', async () => {
    remote.mockResolvedValue({ driveChanged: true, modifiedTime: 'T2' })
    updateSyncMeta(ID, { fullSyncAt: 0 })

    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(fetchedTabs()).toEqual(['هزینه', 'درآمد'])
    expect(getSyncMeta(ID)?.fullSyncAt).toBeGreaterThan(0)
  })

  it('downloads every tab when the change tokens cannot be read', async () => {
    revisionsFetch.mockRejectedValue(new Error('offline'))

    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(fetchedTabs()).toEqual(['هزینه', 'درآمد'])
  })
})

describe('pullRemoteSheets with local writes in flight', () => {
  const LOCAL = [['شناسه'], ['local']]

  beforeEach(() => {
    localStorage.clear()
    remember.mockReset()
    remote.mockReset().mockResolvedValue({ driveChanged: true, modifiedTime: 'T2' })
    revisionsFetch.mockReset().mockResolvedValue(new Map())
    findChanged.mockReset().mockReturnValue([])
    initStore(ID)
    setSheetAllRows(ID, 'هزینه', LOCAL)
    updateSyncMeta(ID, { fullSyncAt: 0 })
    addOutboxEntry(ID, { type: 'append', sheetName: 'هزینه', row: ['local'] })
  })

  it('keeps a tab whose queued write was sent while the download was in flight', async () => {
    batchFetch.mockReset().mockImplementation(async (_id: string, names: string[]) => {
      clearOutbox(ID)

      return new Map(names.map(name => [name, [['شناسه'], ['old']]]))
    })

    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(getSheetAllRows(ID, 'هزینه')).toEqual(LOCAL)
    expect(getSheetAllRows(ID, 'درآمد')).toEqual([['شناسه'], ['old']])
  })

  it('does not count a full download that skipped a tab as a full sync', async () => {
    batchFetch.mockReset().mockImplementation(async (_id: string, names: string[]) => {
      return new Map(names.map(name => [name, [['شناسه'], ['remote']]]))
    })

    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(getSyncMeta(ID)?.fullSyncAt).toBe(0)
    expect(remember).not.toHaveBeenCalled()
  })
})

describe('pullRemoteSheets suspect hand edits', () => {
  beforeEach(() => {
    localStorage.clear()
    remember.mockReset()
    revisionsFetch.mockReset().mockResolvedValue(new Map())
    batchFetch.mockReset().mockImplementation(async (_id: string, names: string[]) => {
      return new Map(names.map(name => [name, [['شناسه'], [name]]]))
    })
    initStore(ID)
    updateSyncMeta(ID, { fullSyncAt: Date.now(), absorbedAt: null })
  })

  it('flags a possible hand edit when tokens and Drive moved together', async () => {
    remote.mockReset().mockResolvedValue({ driveChanged: true, modifiedTime: 'T3' })
    findChanged.mockReset().mockReturnValue(['هزینه'])

    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(fetchedTabs()).toEqual(['هزینه'])
    expect(getSyncMeta(ID)?.absorbedAt).toBeGreaterThan(0)
  })

  it('clears the flag after a full download', async () => {
    remote.mockReset().mockResolvedValue({ driveChanged: true, modifiedTime: 'T4' })
    findChanged.mockReset().mockReturnValue([])
    updateSyncMeta(ID, { absorbedAt: 5 })

    await pullRemoteSheets(ID, SETTINGS, { skipIfUnchanged: true, hadData: true })

    expect(getSyncMeta(ID)?.absorbedAt ?? null).toBeNull()
  })
})

describe('pullRemoteSheets archive tabs', () => {
  const ARCHIVE = 'هزینه 1402'

  beforeEach(() => {
    localStorage.clear()
    remember.mockReset()
    revisionsFetch.mockReset().mockResolvedValue(
      new Map([
        ['هزینه', { title: 'هزینه', sheetId: 1, token: 'a', metadataIds: [] }],
        [ARCHIVE, { title: ARCHIVE, sheetId: 9, token: 'z', metadataIds: [] }]
      ])
    )
    batchFetch.mockReset().mockImplementation(async (_id: string, names: string[]) => {
      return new Map(names.map(name => [name, [['شناسه'], [name]]]))
    })
    findChanged.mockReset().mockReturnValue([])
    initStore(ID)
  })

  it('downloads an archive missing locally during a hand-edit full download', async () => {
    remote.mockReset().mockResolvedValue({ driveChanged: true, modifiedTime: 'T9' })
    updateSyncMeta(ID, { fullSyncAt: Date.now(), coldSyncAt: Date.now() })

    await pullRemoteSheets(ID, { forms: [{ sheetName: 'هزینه' }] } as AppSettings, {
      skipIfUnchanged: true,
      hadData: true
    })

    expect(fetchedTabs()).toEqual(['هزینه', 'درآمد', ARCHIVE])
  })

  it('leaves an archive already held locally out of a hand-edit full download', async () => {
    remote.mockReset().mockResolvedValue({ driveChanged: true, modifiedTime: 'T9' })
    setSheetAllRows(ID, ARCHIVE, [['شناسه'], ['old']])
    updateSyncMeta(ID, { fullSyncAt: Date.now(), coldSyncAt: Date.now() })

    await pullRemoteSheets(ID, { forms: [{ sheetName: 'هزینه' }] } as AppSettings, {
      skipIfUnchanged: true,
      hadData: true
    })

    expect(fetchedTabs()).toEqual(['هزینه', 'درآمد'])
  })

  it('records the daily archive download', async () => {
    remote.mockReset().mockResolvedValue({ driveChanged: false, modifiedTime: 'T9' })
    setSheetAllRows(ID, ARCHIVE, [['شناسه'], ['old']])
    updateSyncMeta(ID, { fullSyncAt: Date.now(), coldSyncAt: 0 })

    await pullRemoteSheets(ID, { forms: [{ sheetName: 'هزینه' }] } as AppSettings, {
      skipIfUnchanged: true,
      hadData: true
    })

    expect(fetchedTabs()).toEqual([ARCHIVE])
    expect(getSyncMeta(ID)?.coldSyncAt).toBeGreaterThan(0)
  })
})

describe('pullRemoteSheets archive tabs without change tokens', () => {
  it('still refreshes archives this device holds when tokens cannot be read', async () => {
    localStorage.clear()
    remote.mockReset().mockResolvedValue({ driveChanged: true, modifiedTime: 'T9' })
    revisionsFetch.mockReset().mockRejectedValue(new Error('offline'))
    batchFetch.mockReset().mockImplementation(async (_id: string, names: string[]) => {
      return new Map(names.map(name => [name, [['شناسه'], [name]]]))
    })
    initStore(ID)
    setSheetAllRows(ID, 'هزینه 1402', [['شناسه'], ['old']])

    await pullRemoteSheets(ID, { forms: [{ sheetName: 'هزینه' }] } as AppSettings, {
      skipIfUnchanged: true,
      hadData: true
    })

    expect(fetchedTabs()).toEqual(['هزینه', 'درآمد', 'هزینه 1402'])
  })
})
