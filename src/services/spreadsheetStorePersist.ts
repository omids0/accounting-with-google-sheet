import {
  getDataKey,
  isEncryptionRequired,
  onBeforeDataKeyRelease,
  onDataKeyChange
} from './appLockDataKey'
import {
  decodeSnapshot,
  encodeSnapshot,
  type PersistedSnapshot,
  type StoredSnapshotRecord
} from './spreadsheetStoreCodec'
import { type LegacySnapshot, legacyKey, snapshotDb } from './spreadsheetStoreDb'
import { getItem, removeItem, setItem } from './storage'

export type { PersistedSnapshot } from './spreadsheetStoreCodec'

const SYNCED_AT_KEY_PREFIX = 'accounting_sheet_synced_at_'

const PERSIST_DEBOUNCE_MS = 1500

const PERSIST_IDLE_TIMEOUT_MS = 3000

type IdleHost = typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

let snapshotProvider: (() => PersistedSnapshot | null) | null = null

let persistTimer: ReturnType<typeof setTimeout> | null = null

let idleHandle: number | null = null

let pendingPersistId: string | null = null

let flushListenersBound = false

/** Spreadsheets that changed while locked; written once the data key is back. */
const deferredPersistIds = new Set<string>()

function syncedAtKey(spreadsheetId: string): string {
  return `${SYNCED_AT_KEY_PREFIX}${spreadsheetId}`
}

/**
 * With the app lock on, the mirror is only ever written encrypted; while the
 * key is not in memory nothing is written at all (the change waits for unlock).
 * The key is read synchronously so a lock right after this call cannot drop it.
 */
function writeSnapshot(snapshot: PersistedSnapshot): Promise<boolean> {
  const required = isEncryptionRequired()

  const key = getDataKey()

  if (required && !key) {
    deferredPersistIds.add(snapshot.spreadsheetId)

    return Promise.resolve(false)
  }

  return encodeSnapshot(snapshot, required ? key : null).then(
    record => snapshotDb.put(record),
    () => false
  )
}

export function readLastSyncedAt(spreadsheetId: string): number | null {
  const legacy = getItem<LegacySnapshot>(legacyKey(spreadsheetId))

  return getItem<number>(syncedAtKey(spreadsheetId)) ?? legacy?.lastSyncedAt ?? null
}

export function writeLastSyncedAt(spreadsheetId: string, ts: number): void {
  setItem(syncedAtKey(spreadsheetId), ts)
}

export function registerSnapshotProvider(provider: () => PersistedSnapshot | null): void {
  snapshotProvider = provider
}

/** The in-memory mirror, which is newer than anything persisted. */
export function getLiveSnapshot(): PersistedSnapshot | null {
  return snapshotProvider?.() ?? null
}

export function cancelScheduledPersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }

  const host = globalThis as IdleHost

  if (idleHandle != null) {
    host.cancelIdleCallback?.(idleHandle)
    idleHandle = null
  }

  pendingPersistId = null
}

/**
 * Writes the pending mirror to IndexedDB now. Bound to page-hide so a debounced
 * write is never dropped when the tab goes away, and run just before the data
 * key is released so the last edits are still encrypted with it.
 */
export function flushStorePersist(): void {
  const spreadsheetId = pendingPersistId

  cancelScheduledPersist()

  if (!spreadsheetId) return

  const snapshot = snapshotProvider?.()

  if (!snapshot || snapshot.spreadsheetId !== spreadsheetId) return

  void writeSnapshot(snapshot)
}

function bindFlushListeners(): void {
  if (flushListenersBound || typeof document === 'undefined') return

  flushListenersBound = true

  window.addEventListener('pagehide', flushStorePersist)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushStorePersist()
  })
}

export function schedulePersist(spreadsheetId: string): void {
  cancelScheduledPersist()
  bindFlushListeners()

  pendingPersistId = spreadsheetId

  const host = globalThis as IdleHost

  persistTimer = setTimeout(() => {
    persistTimer = null

    if (host.requestIdleCallback) {
      idleHandle = host.requestIdleCallback(flushStorePersist, {
        timeout: PERSIST_IDLE_TIMEOUT_MS
      })

      return
    }

    flushStorePersist()
  }, PERSIST_DEBOUNCE_MS)
}

onBeforeDataKeyRelease(flushStorePersist)

onDataKeyChange(key => {
  if (!key || !deferredPersistIds.size) return

  const current = snapshotProvider?.()?.spreadsheetId

  if (current && deferredPersistIds.has(current)) schedulePersist(current)
  deferredPersistIds.clear()
})

export function deleteSnapshot(spreadsheetId: string): Promise<void> {
  cancelScheduledPersist()
  removeItem(legacyKey(spreadsheetId))
  removeItem(syncedAtKey(spreadsheetId))

  return snapshotDb.delete(spreadsheetId)
}

/** Drops the whole sheet mirror database (sign-out). */
export async function deletePersistedDatabase(): Promise<void> {
  cancelScheduledPersist()
  deferredPersistIds.clear()
  await snapshotDb.deleteDatabase()
}

/**
 * Moves a pre-IndexedDB mirror out of `localStorage` (encrypted when the app
 * lock is on). The legacy blob is only dropped once the IndexedDB copy is
 * confirmed, so an interrupted migration retries instead of losing cached sheets.
 */
async function migrateLegacySnapshot(spreadsheetId: string): Promise<PersistedSnapshot | null> {
  const legacy = getItem<LegacySnapshot>(legacyKey(spreadsheetId))

  if (!legacy?.sheets || legacy.spreadsheetId !== spreadsheetId) return null

  const snapshot = { spreadsheetId, sheets: legacy.sheets }

  const written = await writeSnapshot(snapshot)

  if (!written || !(await snapshotDb.get(spreadsheetId))) return snapshot

  if (typeof legacy.lastSyncedAt === 'number') {
    writeLastSyncedAt(spreadsheetId, legacy.lastSyncedAt)
  }

  removeItem(legacyKey(spreadsheetId))

  return snapshot
}

/**
 * Reads the mirror. While the app lock holds the key back nothing is read; a
 * plaintext record found after unlocking is rewritten encrypted in place.
 */
export async function loadPersistedSnapshot(
  spreadsheetId: string
): Promise<PersistedSnapshot | null> {
  const required = isEncryptionRequired()

  const key = getDataKey()

  if (required && !key) return null

  const record = await snapshotDb.get<StoredSnapshotRecord>(spreadsheetId)

  const decoded = await decodeSnapshot(record, key)

  if (decoded.status === 'ok') {
    if (required && !decoded.encrypted) await writeSnapshot(decoded.snapshot)

    return decoded.snapshot
  }

  if (decoded.status === 'locked') return null

  return migrateLegacySnapshot(spreadsheetId)
}
