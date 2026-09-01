import type { AppSettings } from '../types';
import { bumpDataRevision } from './dataRevision';
import { invalidateDashboardCache } from './dashboard';
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

type WriteTask = {
  execute: () => Promise<void>;
  rollback?: () => void;
};

let activeSpreadsheetId: string | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let fullSyncInFlight: Promise<void> | null = null;
let quotaBlockedUntil = 0;
const writeQueue: WriteTask[] = [];
let processingWrites = false;

export function getKnownSheetNames(settings: AppSettings = getSettings()!): string[] {
  if (!settings) return [...STATIC_SHEETS];
  const formSheets = settings.forms.map((form) => form.sheetName);
  return [...new Set([...formSheets, ...STATIC_SHEETS])];
}

function invalidateDerivedCaches(spreadsheetId: string): void {
  invalidateDashboardCache(spreadsheetId);
  invalidateInstallmentsCache(spreadsheetId);
}

function isSyncCoolingDown(spreadsheetId: string): boolean {
  if (Date.now() < quotaBlockedUntil) return true;
  const lastSyncedAt = getStoreLastSyncedAt(spreadsheetId);
  if (!lastSyncedAt) return false;
  return Date.now() - lastSyncedAt < MIN_SYNC_COOLDOWN_MS;
}

export function markQuotaExceeded(): void {
  quotaBlockedUntil = Date.now() + QUOTA_BACKOFF_MS;
  setSyncState(
    'error',
    'محدودیت درخواست Google Sheets پر شده. حدود یک دقیقه صبر کنید و دوباره تلاش کنید.'
  );
}

export function enqueueSheetWrite(
  execute: () => Promise<void>,
  rollback?: () => void
): void {
  if (Date.now() < quotaBlockedUntil) {
    rollback?.();
    return;
  }

  writeQueue.push({ execute, rollback });
  setPendingWrites(writeQueue.length);
  void processWriteQueue();
}

async function processWriteQueue(): Promise<void> {
  if (processingWrites || Date.now() < quotaBlockedUntil) return;
  processingWrites = true;

  while (writeQueue.length > 0) {
    if (Date.now() < quotaBlockedUntil) break;

    const task = writeQueue[0];
    setPendingWrites(writeQueue.length);

    try {
      await task.execute();
      writeQueue.shift();
    } catch (err) {
      task.rollback?.();
      const message = err instanceof Error ? err.message : 'خطا در همگام‌سازی';
      if (isQuotaExceededError(err)) {
        markQuotaExceeded();
        writeQueue.length = 0;
        break;
      }
      setSyncState('error', message);
      writeQueue.shift();
    }

    setPendingWrites(writeQueue.length);
  }

  processingWrites = false;
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
  if (!force && isSyncCoolingDown(spreadsheetId)) return;

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
      initStore(spreadsheetId);
      const sheetNames = getKnownSheetNames(settings);
      const fetched = await fetchSheetsBatchFromApi(spreadsheetId, sheetNames);
      const changed = setManySheetAllRows(spreadsheetId, fetched);

      const now = Date.now();
      setStoreLastSyncedAt(spreadsheetId, now);
      setLastSyncedAt(now);

      if (changed) {
        invalidateDerivedCaches(spreadsheetId);
        bumpDataRevision();
      } else {
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
  if (!options.force && isSyncCoolingDown(id)) return;

  void fullSyncFromRemote(id, { background: true, force: options.force }).catch(() => {
    /* error state handled in fullSyncFromRemote */
  });
}

export async function initializeSheetSync(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId) return;

  activeSpreadsheetId = spreadsheetId;
  initStore(spreadsheetId);

  const lastSyncedAt = getStoreLastSyncedAt(spreadsheetId);
  if (lastSyncedAt) {
    setLastSyncedAt(lastSyncedAt);
  }

  if (hasStoreData(spreadsheetId)) {
    void fullSyncFromRemote(spreadsheetId, { background: true, force: true });
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
  invalidateDerivedCaches(spreadsheetId);
  bumpDataRevision();
}

export function onPageEnter(): void {
  if (!activeSpreadsheetId) return;
  refreshInBackground(activeSpreadsheetId);
}
