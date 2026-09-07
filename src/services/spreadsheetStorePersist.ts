import { getItem, removeItem, setItem } from './storage'

const DB_NAME = 'accounting_sheet_store'

const DB_VERSION = 1

const OBJECT_STORE = 'snapshots'

const LEGACY_KEY_PREFIX = 'accounting_sheet_store_'

const SYNCED_AT_KEY_PREFIX = 'accounting_sheet_synced_at_'

const PERSIST_DEBOUNCE_MS = 1500

const PERSIST_IDLE_TIMEOUT_MS = 3000

/**
 * Shape written to IndexedDB. `lastSyncedAt` is intentionally excluded so that
 * refreshing the sync timestamp never rewrites the whole sheet mirror.
 */
export interface PersistedSnapshot {
  spreadsheetId: string
  sheets: Record<string, string[][]>
}

interface LegacySnapshot extends PersistedSnapshot {
  lastSyncedAt?: number | null
}

type IdleHost = typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

let dbPromise: Promise<IDBDatabase | null> | null = null

let snapshotProvider: (() => PersistedSnapshot | null) | null = null

let persistTimer: ReturnType<typeof setTimeout> | null = null

let idleHandle: number | null = null

let pendingPersistId: string | null = null

let flushListenersBound = false

function legacyKey(spreadsheetId: string): string {
  return `${LEGACY_KEY_PREFIX}${spreadsheetId}`
}

function syncedAtKey(spreadsheetId: string): string {
  return `${SYNCED_AT_KEY_PREFIX}${spreadsheetId}`
}

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase | null>(resolve => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)

      return
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result

        if (!db.objectStoreNames.contains(OBJECT_STORE)) {
          db.createObjectStore(OBJECT_STORE, { keyPath: 'spreadsheetId' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })

  return dbPromise
}

function runRequest<T>(
  mode: IDBTransactionMode,
  build: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openDb().then(db => {
    if (!db) return null

    return new Promise<T | null>(resolve => {
      try {
        const tx = db.transaction(OBJECT_STORE, mode)

        const request = build(tx.objectStore(OBJECT_STORE))

        request.onsuccess = () => resolve(request.result ?? null)
        request.onerror = () => resolve(null)
        tx.onabort = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  })
}

function readSnapshot(spreadsheetId: string): Promise<PersistedSnapshot | null> {
  return runRequest<PersistedSnapshot>('readonly', store => store.get(spreadsheetId))
}

function writeSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  return runRequest('readwrite', store =>
    store.put({ spreadsheetId: snapshot.spreadsheetId, sheets: snapshot.sheets })
  ).then(() => undefined)
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
 * write is never dropped when the tab goes away.
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

export function deleteSnapshot(spreadsheetId: string): Promise<void> {
  cancelScheduledPersist()
  removeItem(legacyKey(spreadsheetId))
  removeItem(syncedAtKey(spreadsheetId))

  return runRequest('readwrite', store => store.delete(spreadsheetId)).then(() => undefined)
}

/**
 * Moves a pre-IndexedDB mirror out of `localStorage`. The legacy blob is only
 * dropped once the IndexedDB copy is confirmed readable, so an interrupted
 * migration retries on the next launch instead of losing cached sheets.
 */
async function migrateLegacySnapshot(spreadsheetId: string): Promise<PersistedSnapshot | null> {
  const legacy = getItem<LegacySnapshot>(legacyKey(spreadsheetId))

  if (!legacy?.sheets || legacy.spreadsheetId !== spreadsheetId) return null

  await writeSnapshot({ spreadsheetId, sheets: legacy.sheets })

  const confirmed = await readSnapshot(spreadsheetId)

  if (!confirmed?.sheets) return { spreadsheetId, sheets: legacy.sheets }

  if (typeof legacy.lastSyncedAt === 'number') {
    writeLastSyncedAt(spreadsheetId, legacy.lastSyncedAt)
  }

  removeItem(legacyKey(spreadsheetId))

  return confirmed
}

export async function loadPersistedSnapshot(
  spreadsheetId: string
): Promise<PersistedSnapshot | null> {
  const stored = await readSnapshot(spreadsheetId)

  if (stored?.sheets) return stored

  return migrateLegacySnapshot(spreadsheetId)
}
