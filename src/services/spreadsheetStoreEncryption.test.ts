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

const SHEETS = {
  کیف_پول: [
    ['تاریخ', 'مبلغ'],
    ['1403/01/01', '250000']
  ]
}

function enableVault(): void {
  localStorage.setItem('accounting_app_lock', JSON.stringify({ enabled: true, vault: { v: 1 } }))
}

async function newKey(): Promise<CryptoKey> {
  const { generateDataKey } = await import('./appLockVault')

  return generateDataKey()
}

function storedText(): string {
  return JSON.stringify([...records.values()].map(record => record.sheets ?? null))
}

describe('sheet mirror encryption at rest', () => {
  beforeEach(async () => {
    records.clear()
    localStorage.clear()
    ;(await import('./appLockDataKey')).clearDataKey()
    ;(await import('./spreadsheetStorePersist')).registerSnapshotProvider(() => null)
  })

  it('keeps plaintext for users without a lock', async () => {
    const { loadPersistedSnapshot } = await import('./spreadsheetStorePersist')

    records.set('sheet-1', { spreadsheetId: 'sheet-1', sheets: SHEETS })

    expect((await loadPersistedSnapshot('sheet-1'))?.sheets).toEqual(SHEETS)
    expect(records.get('sheet-1')?.sheets).toEqual(SHEETS)
  })

  it('encrypts old plaintext records and the legacy localStorage blob when the lock is set', async () => {
    const { reencodeAllSnapshots } = await import('./spreadsheetStoreEncryption')
    const { loadPersistedSnapshot } = await import('./spreadsheetStorePersist')
    const { setDataKey } = await import('./appLockDataKey')

    const key = await newKey()

    records.set('sheet-1', { spreadsheetId: 'sheet-1', sheets: SHEETS })
    localStorage.setItem(
      'accounting_sheet_store_sheet-old',
      JSON.stringify({ spreadsheetId: 'sheet-old', sheets: SHEETS, lastSyncedAt: 5 })
    )
    enableVault()
    setDataKey(key)

    await reencodeAllSnapshots(null, key)

    for (const record of records.values()) {
      expect(record.sheets).toBeUndefined()
      expect(record.enc?.v).toBe(1)
      expect(record.enc?.iv).toHaveLength(12)
    }
    expect(records.has('sheet-old')).toBe(true)
    expect(localStorage.getItem('accounting_sheet_store_sheet-old')).toBeNull()
    expect(storedText()).not.toContain('250000')
    expect((await loadPersistedSnapshot('sheet-1'))?.sheets).toEqual(SHEETS)
  })

  it('reads a plaintext record once after unlock and rewrites it encrypted', async () => {
    const { loadPersistedSnapshot } = await import('./spreadsheetStorePersist')
    const { setDataKey } = await import('./appLockDataKey')

    records.set('sheet-1', { spreadsheetId: 'sheet-1', sheets: SHEETS })
    enableVault()
    setDataKey(await newKey())

    expect((await loadPersistedSnapshot('sheet-1'))?.sheets).toEqual(SHEETS)
    expect(records.get('sheet-1')?.sheets).toBeUndefined()
    expect(records.get('sheet-1')?.enc).toBeDefined()
  })

  it('reads and writes nothing while locked, then persists encrypted after unlock', async () => {
    const persist = await import('./spreadsheetStorePersist')
    const { setDataKey } = await import('./appLockDataKey')

    records.set('sheet-1', { spreadsheetId: 'sheet-1', sheets: SHEETS })
    enableVault()

    expect(await persist.loadPersistedSnapshot('sheet-1')).toBeNull()

    const fresh = { spreadsheetId: 'sheet-1', sheets: { a: [['fetched-from-network']] } }

    persist.registerSnapshotProvider(() => fresh)
    persist.schedulePersist('sheet-1')
    persist.flushStorePersist()
    await Promise.resolve()

    expect(records.get('sheet-1')?.sheets).toEqual(SHEETS)

    setDataKey(await newKey())
    persist.flushStorePersist()
    await vi.waitFor(() => expect(records.get('sheet-1')?.enc).toBeDefined())
    expect(storedText()).not.toContain('fetched-from-network')
  })

  it('turns the records back into plaintext when the lock is removed', async () => {
    const { reencodeAllSnapshots } = await import('./spreadsheetStoreEncryption')
    const { encodeSnapshot } = await import('./spreadsheetStoreCodec')

    const key = await newKey()

    records.set('sheet-1', await encodeSnapshot({ spreadsheetId: 'sheet-1', sheets: SHEETS }, key))

    await reencodeAllSnapshots(key, null)

    expect(records.get('sheet-1')).toEqual({ spreadsheetId: 'sheet-1', sheets: SHEETS })
  })

  it('drops a record that a wrong key cannot open instead of keeping garbage', async () => {
    const { reencodeAllSnapshots } = await import('./spreadsheetStoreEncryption')
    const { encodeSnapshot } = await import('./spreadsheetStoreCodec')

    records.set(
      'sheet-1',
      await encodeSnapshot({ spreadsheetId: 'sheet-1', sheets: SHEETS }, await newKey())
    )

    await reencodeAllSnapshots(await newKey(), null)

    expect(records.has('sheet-1')).toBe(false)
  })
})
