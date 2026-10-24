import { logSync } from './syncLog'

export type ConnectionState = 'online' | 'offline'
export type SyncState = 'idle' | 'syncing' | 'error'

export interface SyncStatusSnapshot {
  connection: ConnectionState
  syncState: SyncState
  lastSyncedAt: number | null
  pendingWrites: number
  /** Writes Google refused for good; kept until the user dismisses them. */
  failedWrites: number
  /** Updates waiting for «کدام بماند؟» (round 8 edit conflicts). */
  conflicts: number
  lastError: string | null
}

let status: SyncStatusSnapshot = {
  connection: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  syncState: 'idle',
  lastSyncedAt: null,
  pendingWrites: 0,
  failedWrites: 0,
  conflicts: 0,
  lastError: null
}

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function patchStatus(patch: Partial<SyncStatusSnapshot>): void {
  status = { ...status, ...patch }
  notify()
}

export function getSyncStatus(): SyncStatusSnapshot {
  return status
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function setConnectionState(connection: ConnectionState): void {
  if (status.connection === connection) return
  logSync('connection', connection)
  patchStatus({ connection })
}

/** `synced`: a write just reached the sheet, which counts as a sync for «آخرین بروزرسانی». */
export function setSyncState(
  syncState: SyncState,
  lastError: string | null = null,
  synced = false
): void {
  if (syncState !== status.syncState || (syncState === 'error' && lastError !== status.lastError)) {
    logSync(`state:${syncState}`, syncState === 'error' ? lastError ?? undefined : undefined)
  }
  patchStatus({
    syncState,
    lastError: syncState === 'error' ? lastError : null,
    ...(synced ? { lastSyncedAt: Date.now() } : {})
  })
}

export function setLastSyncedAt(lastSyncedAt: number): void {
  patchStatus({ lastSyncedAt, syncState: 'idle', lastError: null })
}

export function setPendingWrites(pendingWrites: number): void {
  if (status.pendingWrites === pendingWrites) return
  patchStatus({ pendingWrites })
}

export function setFailedWrites(failedWrites: number): void {
  if (status.failedWrites === failedWrites) return
  logSync('failed-writes', String(failedWrites))
  patchStatus({ failedWrites })
}

export function setConflictCount(conflicts: number): void {
  if (status.conflicts === conflicts) return
  logSync('conflicts', String(conflicts))
  patchStatus({ conflicts })
}

export function initSyncStatusListeners(): () => void {
  const onOnline = () => {
    setConnectionState('online')
    void import('./sheetSync').then(({ getActiveSpreadsheetId, retryPendingWrites }) => {
      const spreadsheetId = getActiveSpreadsheetId()

      if (!spreadsheetId) return
      void retryPendingWrites(spreadsheetId)
    })
  }

  const onOffline = () => setConnectionState('offline')

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  setConnectionState(navigator.onLine ? 'online' : 'offline')

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
