export type ConnectionState = 'online' | 'offline';
export type SyncState = 'idle' | 'syncing' | 'error';

export interface SyncStatusSnapshot {
  connection: ConnectionState;
  syncState: SyncState;
  lastSyncedAt: number | null;
  pendingWrites: number;
  lastError: string | null;
}

let status: SyncStatusSnapshot = {
  connection: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  syncState: 'idle',
  lastSyncedAt: null,
  pendingWrites: 0,
  lastError: null,
};

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function patchStatus(patch: Partial<SyncStatusSnapshot>): void {
  status = { ...status, ...patch };
  notify();
}

export function getSyncStatus(): SyncStatusSnapshot {
  return status;
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setConnectionState(connection: ConnectionState): void {
  if (status.connection === connection) return;
  patchStatus({ connection });
}

export function setSyncState(syncState: SyncState, lastError: string | null = null): void {
  patchStatus({
    syncState,
    lastError: syncState === 'error' ? lastError : null,
  });
}

export function setLastSyncedAt(lastSyncedAt: number): void {
  patchStatus({ lastSyncedAt, syncState: 'idle', lastError: null });
}

export function setPendingWrites(pendingWrites: number): void {
  if (status.pendingWrites === pendingWrites) return;
  patchStatus({ pendingWrites });
}

export function initSyncStatusListeners(): () => void {
  const onOnline = () => {
    setConnectionState('online');
    void import('./sheetSync').then(({ getActiveSpreadsheetId, retryPendingWrites }) => {
      const spreadsheetId = getActiveSpreadsheetId();
      if (!spreadsheetId) return;
      void retryPendingWrites(spreadsheetId);
    });
  };
  const onOffline = () => setConnectionState('offline');
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  setConnectionState(navigator.onLine ? 'online' : 'offline');
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
