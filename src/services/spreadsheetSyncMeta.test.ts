import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoredSnapshotRecord } from './spreadsheetStoreCodec'
import type * as StoreDbModule from './spreadsheetStoreDb'

/** In-memory stand-in for the IndexedDB mirror (jsdom has no IndexedDB). */
const records = new Map<string, StoredSnapshotRecord>()

vi.mock('./spreadsheetStoreDb', async importOriginal => ({
  ...(await importOriginal<typeof StoreDbModule>()),
  snapshotDb: {
    get: async (id: string) => structuredClone(records.get(id)) ?? null,
    getAll: async () => [...records.values()].map(record => structuredClone(record)),
    put: async (record: StoredSnapshotRecord) => {
      records.set(record.spreadsheetId, structuredClone(record))

      return true
    },
    delete: async (id: string) => {
      records.delete(id)
    },
    deleteDatabase: async () => records.clear()
  }
}))

const ID = 'sheet-1'

const ROWS = [
  ['شناسه', 'مبلغ'],
  ['1', '500']
]

/** A fresh app start: module state is gone, only the persisted record remains. */
async function restart() {
  vi.resetModules()

  const store = await import('./spreadsheetStore')
  const meta = await import('./spreadsheetSyncMeta')
  const persist = await import('./spreadsheetStorePersist')

  return { ...store, ...meta, ...persist }
}

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('sync meta persisted with the mirror', () => {
  beforeEach(() => {
    records.clear()
    localStorage.clear()
  })

  it('is unknown on a device that never synced', async () => {
    const app = await restart()

    await app.hydrateStore(ID)

    expect(app.getSyncMeta(ID)).toBeNull()
  })

  it('survives a restart in the same record as the sheets it describes', async () => {
    const first = await restart()

    first.initStore(ID)
    first.setSheetAllRows(ID, 'هزینه', ROWS)
    first.updateSyncMeta(ID, { tokens: { هزینه: 'a' }, modifiedTime: 'T1', fullSyncAt: 1000 })
    first.flushStorePersist()
    await settle()

    const second = await restart()

    await second.hydrateStore(ID)

    expect(second.getSheetAllRows(ID, 'هزینه')).toEqual(ROWS)
    expect(second.getSyncMeta(ID)).toEqual({
      tokens: { هزینه: 'a' },
      modifiedTime: 'T1',
      fullSyncAt: 1000
    })
  })

  it('merges partial updates and can be cleared', async () => {
    const app = await restart()

    app.initStore(ID)
    app.updateSyncMeta(ID, { tokens: { هزینه: 'a' } })
    app.updateSyncMeta(ID, { modifiedTime: 'T2' })

    expect(app.getSyncMeta(ID)).toEqual({
      tokens: { هزینه: 'a' },
      modifiedTime: 'T2',
      fullSyncAt: null
    })

    app.clearSyncMeta(ID)
    expect(app.getSyncMeta(ID)).toBeNull()
  })

  it('ignores updates for a spreadsheet that is not loaded', async () => {
    const app = await restart()

    app.initStore(ID)
    app.updateSyncMeta('other-sheet', { modifiedTime: 'T9' })

    expect(app.getSyncMeta('other-sheet')).toBeNull()
    expect(app.getSyncMeta(ID)).toBeNull()
  })
})
