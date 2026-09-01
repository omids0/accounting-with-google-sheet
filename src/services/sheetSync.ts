import type { AppSettings } from '../types';
import type { OutboxOperation } from './syncOutbox';
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange';
import { invalidateInstallmentsCache } from './installments';
import { getSettings } from './settings';
import {
  clearStore,
  getStoreLastSyncedAt,
  hasStoreData,
  initStore,
  setManySheetAllRows,
  setStoreLastSyncedAt,
} from './spreadsheetStore';
import {
  addOutboxEntry,
  clearOutbox,
  getOutboxCount,
  getOutboxEntries,
  getOutboxSheetNames,
  hasPendingOutbox,
  markOutboxEntryFailed,
  removeOutboxEntry,
} from './syncOutbox';
import {
  getSyncStatus,
  setLastSyncedAt,
  setPendingWrites,
  setSyncState,
} from './syncStatus';
import { isQuotaExceededError } from './sheets';
import { INSTALLMENTS_SHEET } from './installments';
import { DANG_SHEET } from './dang';
import { CHECKS_SHEET } from './checks';
import { RECEIVABLES_SHEET } from './receivables';
import { TREASURY_SHEET } from './treasury';
import { WALLET_SHEET } from './wallet';
import { CATEGORIES_SHEET } from './categories';
import { MONTHLY_BALANCE_SHEET } from './monthlyBalance';
import { REMINDERS_SHEET, PUSH_SUBS_SHEET } from './reminders';

const SYNC_INTERVAL_MS = 120_000;
const MIN_SYNC_COOLDOWN_MS = 30_000;
const QUOTA_BACKOFF_MS = 90_000;

const STATIC_SHEETS = [
  INSTALLMENTS_SHEET,
  DANG_SHEET,
  CHECKS_SHEET,
  RECEIVABLES_SHEET,
  TREASURY_SHEET,
  WALLET_SHEET,
  CATEGORIES_SHEET,
  MONTHLY_BALANCE_SHEET,
  REMINDERS_SHEET,
  PUSH_SUBS_SHEET,
];

let activeSpreadsheetId: string | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let fullSyncInFlight: Promise<void> | null = null;
let flushInFlight: Promise<boolean> | null = null;
let quotaBlockedUntil = 0;

export function getKnownSheetNames(settings: AppSettings = getSettings()!): string[] {
  if (!settings) return [...STATIC_SHEETS];
  const formSheets = settings.forms.map((form) => form.sheetName);
  return [...new Set([...formSheets, ...STATIC_SHEETS])];
}

function invalidateDerivedCaches(spreadsheetId: string): void {
  invalidateInstallmentsCache(spreadsheetId);
}

function isSyncCoolingDown(spreadsheetId: string): boolean {
  if (Date.now() < quotaBlockedUntil) return true;
  const lastSyncedAt = getStoreLastSyncedAt(spreadsheetId);
  if (!lastSyncedAt) return false;
  return Date.now() - lastSyncedAt < MIN_SYNC_COOLDOWN_MS;
}

function refreshPendingCount(spreadsheetId: string): void {
  setPendingWrites(getOutboxCount(spreadsheetId));
}

export function markQuotaExceeded(): void {
  quotaBlockedUntil = Date.now() + QUOTA_BACKOFF_MS;
  setSyncState(
    'error',
    'محدودیت درخواست Google Sheets پر شده. حدود یک دقیقه صبر کنید و دوباره تلاش کنید.'
  );
}

export function queueOutboxWrite(
  spreadsheetId: string,
  operation: OutboxOperation
): void {
  addOutboxEntry(spreadsheetId, operation);
  refreshPendingCount(spreadsheetId);
  void flushOutbox(spreadsheetId);
}

export async function flushOutbox(spreadsheetId: string): Promise<boolean> {
  if (!spreadsheetId) return true;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (Date.now() < quotaBlockedUntil) return false;

  if (flushInFlight) {
    return flushInFlight;
  }

  const task = (async () => {
    const { executeOutboxOperation } = await import('./sheets');
    const entries = getOutboxEntries(spreadsheetId);

    if (!entries.length) {
      refreshPendingCount(spreadsheetId);
      return true;
    }

    setSyncState('syncing');

    for (const entry of entries) {
      if (Date.now() < quotaBlockedUntil) return false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

      try {
        await executeOutboxOperation(spreadsheetId, entry.operation);
        removeOutboxEntry(spreadsheetId, entry.id);
        refreshPendingCount(spreadsheetId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطا در همگام‌سازی';
        markOutboxEntryFailed(spreadsheetId, entry.id, message);

        if (isQuotaExceededError(err)) {
          markQuotaExceeded();
          return false;
        }

        setSyncState('error', message);
        refreshPendingCount(spreadsheetId);
        return false;
      }
    }

    refreshPendingCount(spreadsheetId);
    if (!hasPendingOutbox(spreadsheetId)) {
      setSyncState('idle');
    }
    return true;
  })();

  flushInFlight = task.finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}

async function fetchSheetsBatchFromApi(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[][]>> {
  const { batchFetchSheetRangesFromApi } = await import('./sheets');
  return batchFetchSheetRangesFromApi(spreadsheetId, sheetNames);
}

export async function fullSyncFromRemote(
  spreadsheetId: string,
  options: { background?: boolean; force?: boolean } = {}
): Promise<void> {
  if (!spreadsheetId) return;
  if (Date.now() < quotaBlockedUntil) return;

  const force = options.force ?? false;
  if (!force && isSyncCoolingDown(spreadsheetId) && !hasPendingOutbox(spreadsheetId)) {
    return;
  }

  if (fullSyncInFlight) {
    await fullSyncInFlight;
    return;
  }

  const settings = getSettings();
  if (!settings) return;

  const background = options.background ?? false;
  const hadData = hasStoreData(spreadsheetId);

  if (!background || !hadData) {
    setSyncState('syncing');
  }

  const task = (async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await flushOutbox(spreadsheetId);
      }

      const blockedSheets = getOutboxSheetNames(spreadsheetId);
      if (blockedSheets.size > 0 && typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncState('idle');
        return;
      }

      if (blockedSheets.size > 0) {
        const flushed = await flushOutbox(spreadsheetId);
        if (!flushed) {
          return;
        }
      }

      const stillBlocked = getOutboxSheetNames(spreadsheetId);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncState('idle');
        return;
      }

      initStore(spreadsheetId);
      const sheetNames = getKnownSheetNames(settings);
      const fetched = await fetchSheetsBatchFromApi(spreadsheetId, sheetNames);
      const filtered = new Map<string, string[][]>();

      for (const [sheetName, rows] of fetched) {
        if (stillBlocked.has(sheetName)) continue;
        filtered.set(sheetName, rows);
      }

      if (!filtered.size) {
        if (!hasPendingOutbox(spreadsheetId)) {
          setSyncState('idle');
        }
        return;
      }

      const changed = setManySheetAllRows(spreadsheetId, filtered);
      const now = Date.now();
      setStoreLastSyncedAt(spreadsheetId, now);
      setLastSyncedAt(now);

      if (changed) {
        invalidateDerivedCaches(spreadsheetId);
        notifySpreadsheetDataChanged(spreadsheetId);
      } else if (!hasPendingOutbox(spreadsheetId)) {
        setSyncState('idle');
      }
    } catch (err) {
      if (isQuotaExceededError(err)) {
        markQuotaExceeded();
        return;
      }
      const message = err instanceof Error ? err.message : 'خطا در دریافت داده';
      setSyncState('error', message);
      throw err;
    }
  })();

  fullSyncInFlight = task.finally(() => {
    fullSyncInFlight = null;
  });

  await fullSyncInFlight;
}

export function refreshInBackground(
  spreadsheetId?: string,
  options: { force?: boolean } = {}
): void {
  const id = spreadsheetId ?? activeSpreadsheetId;
  if (!id || getSyncStatus().syncState === 'syncing') return;
  if (!options.force && isSyncCoolingDown(id) && !hasPendingOutbox(id)) return;

  void fullSyncFromRemote(id, { background: true, force: options.force }).catch(() => {
    /* error state handled in fullSyncFromRemote */
  });
}

export async function initializeSheetSync(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId) return;

  activeSpreadsheetId = spreadsheetId;
  initStore(spreadsheetId);
  refreshPendingCount(spreadsheetId);

  const lastSyncedAt = getStoreLastSyncedAt(spreadsheetId);
  if (lastSyncedAt) {
    setLastSyncedAt(lastSyncedAt);
  }

  if (hasStoreData(spreadsheetId)) {
    if (hasPendingOutbox(spreadsheetId)) {
      void flushOutbox(spreadsheetId).then(() => {
        void fullSyncFromRemote(spreadsheetId, { background: true, force: true });
      });
    } else {
      void fullSyncFromRemote(spreadsheetId, { background: true, force: true });
    }
  } else {
    await fullSyncFromRemote(spreadsheetId, { background: false, force: true });
  }

  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    refreshInBackground(spreadsheetId);
  }, SYNC_INTERVAL_MS);
}

export function stopSheetSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  activeSpreadsheetId = null;
}

export function resetSheetSync(spreadsheetId: string): void {
  stopSheetSync();
  clearStore(spreadsheetId);
  clearOutbox(spreadsheetId);
  setPendingWrites(0);
  invalidateDerivedCaches(spreadsheetId);
  notifySpreadsheetDataChanged(spreadsheetId);
}

export function onPageEnter(): void {
  if (!activeSpreadsheetId) return;
  void flushOutbox(activeSpreadsheetId).then((flushed) => {
    if (flushed) {
      refreshInBackground(activeSpreadsheetId ?? undefined);
    }
  });
}

export function getActiveSpreadsheetId(): string | null {
  return activeSpreadsheetId;
}

export async function retryPendingWrites(spreadsheetId?: string): Promise<void> {
  const id = spreadsheetId ?? activeSpreadsheetId;
  if (!id) return;
  const flushed = await flushOutbox(id);
  if (flushed) {
    await fullSyncFromRemote(id, { background: true, force: true });
  }
}

// Backwards-compatible alias used by sheets.ts
export function enqueueSheetWrite(
  spreadsheetId: string,
  operation: OutboxOperation
): void {
  queueOutboxWrite(spreadsheetId, operation);
}
