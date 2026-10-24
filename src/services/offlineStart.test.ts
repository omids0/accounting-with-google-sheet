import { beforeEach, describe, expect, it, vi } from 'vitest'

import { startOfflineFromCache } from './offlineStart'

const settings = { spreadsheetId: 'sheet-1' as string | undefined }

/** What IndexedDB holds for the sheet; reading it is a macrotask, like the real thing. */
let persisted: Record<string, string[][]> = {}

let inMemory: Record<string, string[][]> = {}

const initializeSheetSync = vi.fn(async (_id: string) => undefined)

const hydrateStore = vi.fn(async (_id: string) => {
  await new Promise(resolve => setTimeout(resolve, 20))
  inMemory = persisted
})

vi.mock('./settings', () => ({ getSettings: () => settings }))

vi.mock('./sheetSync', () => ({ initializeSheetSync: (id: string) => initializeSheetSync(id) }))

vi.mock('./spreadsheetStore', () => ({
  hasStoreData: () => Object.keys(inMemory).length > 0,
  hydrateStore: (id: string) => hydrateStore(id)
}))

describe('startOfflineFromCache', () => {
  beforeEach(() => {
    settings.spreadsheetId = 'sheet-1'
    persisted = { Records: [['id']] }
    inMemory = {}
    initializeSheetSync.mockClear()
    hydrateStore.mockClear()
  })

  it('waits for the cache read when the renewal failed before it finished, and stays in the app', async () => {
    await expect(startOfflineFromCache()).resolves.toBe(true)

    expect(hydrateStore).toHaveBeenCalledWith('sheet-1')
    expect(initializeSheetSync).toHaveBeenCalledWith('sheet-1')
  })

  it('does not read the cache again when start-up already did (it would drop unsaved writes)', async () => {
    inMemory = { Records: [['id']] }

    await expect(startOfflineFromCache()).resolves.toBe(true)
    expect(hydrateStore).not.toHaveBeenCalled()
  })

  it('goes to the login when this device holds no data for the sheet', async () => {
    persisted = {}

    await expect(startOfflineFromCache()).resolves.toBe(false)
    expect(initializeSheetSync).not.toHaveBeenCalled()
  })

  it('goes to the login when no spreadsheet was ever set up here', async () => {
    settings.spreadsheetId = undefined

    await expect(startOfflineFromCache()).resolves.toBe(false)
    expect(hydrateStore).not.toHaveBeenCalled()
  })

  it('still opens the app when starting the sync fails', async () => {
    initializeSheetSync.mockRejectedValueOnce(new Error('offline'))

    await expect(startOfflineFromCache()).resolves.toBe(true)
  })
})
