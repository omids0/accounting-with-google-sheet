import { invalidateInstallmentsCache } from './installments'
import { isQuotaExceededError } from './sheets'
import { isPermanentApiError } from './sheetsApi'
import { normalizeSheetTitle } from './sheetsMeta'
import { createRowGuardSession, RowConflictError } from './sheetsRowGuard'
import {
  addOutboxEntry,
  clearFailedOutboxEntries,
  getFailedOutboxEntries,
  getOutboxCount,
  getOutboxEntries,
  hasPendingOutbox,
  markOutboxEntryFailed,
  moveOutboxEntryToFailed,
  removeOutboxEntry,
  requeueMissingTabAppends
} from './syncOutbox'
import type { OutboxOperation } from './syncOutbox'
import { setFailedWrites, setPendingWrites, setSyncState } from './syncStatus'

const QUOTA_BACKOFF_MS = 90_000

/** Safety net so a queue that keeps growing during a flush cannot spin forever. */
const MAX_FLUSH_PASSES = 5

let quotaBlockedUntil = 0

const flushesInFlight = new Map<string, Promise<boolean>>()

export function markQuotaExceeded(): void {
  quotaBlockedUntil = Date.now() + QUOTA_BACKOFF_MS
  setSyncState(
    'error',
    'محدودیت درخواست Google Sheets پر شده. حدود یک دقیقه صبر کنید و دوباره تلاش کنید.'
  )
}

export function isQuotaBlocked(): boolean {
  return Date.now() < quotaBlockedUntil
}

function refreshPendingCount(spreadsheetId: string): void {
  setPendingWrites(getOutboxCount(spreadsheetId))
}

export function refreshFailedCount(spreadsheetId: string): void {
  setFailedWrites(getFailedOutboxEntries(spreadsheetId).length)
}

/** The user has seen the parked writes; forget them. */
export function dismissFailedWrites(spreadsheetId: string): void {
  clearFailedOutboxEntries(spreadsheetId)
  setFailedWrites(0)
}

export function queueOutboxWrite(spreadsheetId: string, operation: OutboxOperation): void {
  addOutboxEntry(spreadsheetId, operation)
  refreshPendingCount(spreadsheetId)
  void flushOutbox(spreadsheetId)
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

type PassResult = 'done' | 'blocked'

/** Drive's modifiedTime right before this device writes; null when unreadable. */
async function readDriveTime(spreadsheetId: string): Promise<string | null> {
  try {
    const { fetchRemoteModifiedTime } = await import('./sheetRemoteVersion')

    return await fetchRemoteModifiedTime(spreadsheetId)
  } catch {
    return null
  }
}

/**
 * Tells other devices which tabs changed (change tokens). The new Drive
 * modifiedTime is taken as this device's own only when Drive still matched the
 * mirror right before the flush: otherwise it would also cover a hand edit made
 * since the last check, and that edit would never be downloaded.
 * Best effort: on failure others still see the change through modifiedTime.
 */
async function announceWrites(
  spreadsheetId: string,
  touched: Set<string>,
  driveBefore: string | null,
  redirected: Set<string> = new Set()
): Promise<void> {
  if (!touched.size) return

  try {
    const { forgetSeenSheets, stampSheetRevisions } = await import('./sheetRevisions')
    const { fetchRemoteModifiedTime, rememberRemoteVersion } = await import('./sheetRemoteVersion')
    const { getSyncMeta } = await import('./spreadsheetSyncMeta')

    await stampSheetRevisions(spreadsheetId, touched)
    // A write that followed its row into an archive changed that tab only
    // remotely: download it again rather than trust the local copy.
    if (redirected.size) forgetSeenSheets(spreadsheetId, redirected)

    if (driveBefore && driveBefore === getSyncMeta(spreadsheetId)?.modifiedTime) {
      rememberRemoteVersion(spreadsheetId, await fetchRemoteModifiedTime(spreadsheetId))
    }
  } catch {
    /* change detection falls back to a full download */
  }
}

/** Sends every entry queued right now. Permanent failures are parked, not retried forever. */
async function flushPass(
  spreadsheetId: string,
  touched: Set<string>,
  redirected: Set<string>
): Promise<PassResult> {
  const { executeOutboxOperation } = await import('./sheets')

  const session = createRowGuardSession()

  for (const entry of getOutboxEntries(spreadsheetId)) {
    if (isQuotaBlocked() || isOffline()) return 'blocked'

    try {
      const written = await executeOutboxOperation(spreadsheetId, entry.operation, {
        session,
        isRetry: entry.attempts > 0
      })

      removeOutboxEntry(spreadsheetId, entry.id)
      refreshPendingCount(spreadsheetId)
      // An edit may have followed its row into a yearly archive: stamp that tab.
      touched.add(written || entry.operation.sheetName)
      if (written && written !== entry.operation.sheetName) redirected.add(written)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطا در همگام‌سازی'

      if (err instanceof RowConflictError || isPermanentApiError(err)) {
        moveOutboxEntryToFailed(spreadsheetId, entry.id, message)
        refreshPendingCount(spreadsheetId)
        refreshFailedCount(spreadsheetId)
        setSyncState('error', `یک تغییر اعمال نشد: ${message}`)
        continue
      }

      markOutboxEntryFailed(spreadsheetId, entry.id, message)

      if (isQuotaExceededError(err)) {
        markQuotaExceeded()

        return 'blocked'
      }

      setSyncState('error', message)
      refreshPendingCount(spreadsheetId)

      return 'blocked'
    }
  }

  return 'done'
}

async function runFlush(spreadsheetId: string): Promise<boolean> {
  if (!hasPendingOutbox(spreadsheetId)) {
    refreshPendingCount(spreadsheetId)

    return true
  }

  setSyncState('syncing')

  // Writes queued while a pass was running are picked up by the next pass
  // instead of waiting for the next sync trigger.
  const touched = new Set<string>()

  const redirected = new Set<string>()

  const driveBefore = await readDriveTime(spreadsheetId)

  try {
    for (let pass = 0; pass < MAX_FLUSH_PASSES && hasPendingOutbox(spreadsheetId); pass += 1) {
      if ((await flushPass(spreadsheetId, touched, redirected)) === 'blocked') return false
    }
  } finally {
    await announceWrites(spreadsheetId, touched, driveBefore, redirected)
  }

  refreshPendingCount(spreadsheetId)
  if (!hasPendingOutbox(spreadsheetId)) {
    setSyncState('idle')
  }

  return !hasPendingOutbox(spreadsheetId)
}

/**
 * Two open tabs share one localStorage outbox; without a cross-tab lock both
 * would send the same append twice and the second delete would hit another row.
 */
/**
 * Cross-tab lock shared by the outbox flush and the yearly archive sweep, so
 * no local write reaches the sheet while rows are being moved.
 */
export function withOutboxLock<T>(spreadsheetId: string, task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined

  if (!locks?.request) return task()

  return locks.request(`accounting-outbox-${spreadsheetId}`, task).then(result => result)
}

export async function flushOutbox(spreadsheetId: string): Promise<boolean> {
  if (!spreadsheetId) return true
  if (isOffline()) return false
  if (isQuotaBlocked()) return false

  const running = flushesInFlight.get(spreadsheetId)

  if (running) return running

  const task = withOutboxLock(spreadsheetId, () => runFlush(spreadsheetId)).finally(() => {
    flushesInFlight.delete(spreadsheetId)
  })

  flushesInFlight.set(spreadsheetId, task)

  return task
}

/**
 * A download just returned these tabs. Appends parked while a tab was missing go out
 * again, and the returned map is each such tab as it will read once they land:
 * the downloaded rows plus the revived ones (the download replaced the local copy).
 */
export function reviveMissingTabAppends(
  spreadsheetId: string,
  fetched: Map<string, string[][]>
): Map<string, string[][]> {
  const revived = requeueMissingTabAppends(spreadsheetId, fetched.keys())
  const downloaded = new Map(
    [...fetched].map(([name, rows]) => [normalizeSheetTitle(name), { name, rows }])
  )
  const merged = new Map<string, string[][]>()

  for (const { operation } of revived) {
    const tab = downloaded.get(normalizeSheetTitle(operation.sheetName))

    if (operation.type !== 'append' || !tab) continue

    merged.set(tab.name, [...(merged.get(tab.name) ?? tab.rows), operation.row])
  }

  if (revived.length) {
    refreshPendingCount(spreadsheetId)
    refreshFailedCount(spreadsheetId)
    void flushOutbox(spreadsheetId)
  }

  return merged
}

export function invalidateDerivedCaches(spreadsheetId: string): void {
  invalidateInstallmentsCache(spreadsheetId)
}
