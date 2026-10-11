import { getStore } from './spreadsheetStore'
import type { SyncMeta } from './spreadsheetStoreCodec'
import { schedulePersist } from './spreadsheetStorePersist'

export type { SyncMeta } from './spreadsheetStoreCodec'

const UNKNOWN: SyncMeta = { tokens: null, modifiedTime: null, fullSyncAt: null }

/** What the loaded mirror matches remotely, or null when this device does not know. */
export function getSyncMeta(spreadsheetId: string): SyncMeta | null {
  return getStore(spreadsheetId)?.sync ?? null
}

/**
 * Merges into the sync meta of the loaded mirror and persists it with the
 * sheets. Ignored for a spreadsheet that is not loaded, so it can never be
 * attached to another spreadsheet's rows.
 */
export function updateSyncMeta(spreadsheetId: string, patch: Partial<SyncMeta>): void {
  const store = getStore(spreadsheetId)

  if (!store) return

  store.sync = { ...UNKNOWN, ...store.sync, ...patch }
  schedulePersist(spreadsheetId)
}

export function clearSyncMeta(spreadsheetId: string): void {
  const store = getStore(spreadsheetId)

  if (!store?.sync) return

  store.sync = null
  schedulePersist(spreadsheetId)
}
