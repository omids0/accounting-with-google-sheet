import { createIdbStore } from './idbStore'
import type { PersistedSnapshot } from './spreadsheetStoreCodec'

/** IndexedDB mirror of every sheet, one record per spreadsheet. */
export const snapshotDb = createIdbStore({
  dbName: 'accounting_sheet_store',
  storeName: 'snapshots',
  keyPath: 'spreadsheetId'
})

/** Before IndexedDB the mirror was one plaintext localStorage blob per spreadsheet. */
export const LEGACY_KEY_PREFIX = 'accounting_sheet_store_'

export interface LegacySnapshot extends PersistedSnapshot {
  lastSyncedAt?: number | null
}

export function legacyKey(spreadsheetId: string): string {
  return `${LEGACY_KEY_PREFIX}${spreadsheetId}`
}

export function legacySnapshotKeys(): string[] {
  const keys: string[] = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      if (key?.startsWith(LEGACY_KEY_PREFIX)) keys.push(key)
    }
  } catch {
    // Storage unavailable: nothing to migrate.
  }

  return keys
}
