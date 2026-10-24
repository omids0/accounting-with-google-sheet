import { invalidateInstallmentsCache } from './installmentsConstants'
import { withOutboxLock } from './outboxLock'
import { RowEditConflictError } from './rowConflict'
import { ACTIVITY_SHEET } from './sheetNames'
import { isQuotaExceededError } from './sheets'
import { isPermanentApiError, SheetsApiError } from './sheetsApi'
import { normalizeSheetTitle } from './sheetsMeta'
import { createRowGuardSession, RowConflictError } from './sheetsRowGuard'
import { announceWrites, readDriveTime } from './sheetSyncAnnounce'
import { logSync } from './syncLog'
import {
  addOutboxEntry,
  clearFailedOutboxEntries,
  getFailedOutboxEntries,
  getConflictEntries,
  getOutboxCount,
  getOutboxEntries,
  hasPendingOutbox,
  markOutboxEntryConflict,
  markOutboxEntryFailed,
  moveOutboxEntryToFailed,
  removeOutboxEntry,
  requeueMissingTabAppends
} from './syncOutbox'
import type { OutboxEntry, OutboxOperation } from './syncOutbox'
import { clearInFlight, coalesceUpdate, markInFlight } from './syncOutboxCoalesce'
import { setConflictCount, setFailedWrites, setPendingWrites, setSyncState } from './syncStatus'
import { toUserMessage } from '../utils/userMessage'

const QUOTA_BACKOFF_MS = 90_000

/** Safety net so a queue that keeps growing during a flush cannot spin forever. */
const MAX_FLUSH_PASSES = 5

let quotaBlockedUntil = 0

/** A single flush running this long is reported in the sync log as stuck. */
const STALL_WARNING_MS = 45_000

/** The write being sent right now, for the stall report. */
let currentWrite: string | null = null

const flushesInFlight = new Map<string, Promise<boolean>>()

const describeWrite = (entry: OutboxEntry): string =>
  `${entry.operation.type} «${entry.operation.sheetName}» تلاش ${entry.attempts + 1}`

export { withOutboxLock }

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

export function refreshPendingCount(spreadsheetId: string): void {
  setPendingWrites(getOutboxCount(spreadsheetId))
  setConflictCount(getConflictEntries(spreadsheetId).length)
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
  addOutboxEntry(spreadsheetId, coalesceUpdate(spreadsheetId, operation))
  refreshPendingCount(spreadsheetId)
  refreshFailedCount(spreadsheetId)
  void flushOutbox(spreadsheetId)
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

type PassResult = 'done' | 'blocked'

/**
 * Sends every entry queued right now. Permanent failures are parked, not retried forever.
 * A write that fails for a passing reason holds back only the later writes to the same tab
 * (their order matters); other tabs keep going, so one bad write cannot freeze the queue.
 */
async function flushPass(
  spreadsheetId: string,
  touched: Set<string>,
  redirected: Set<string>
): Promise<PassResult> {
  const { executeOutboxOperation } = await import('./sheets')

  const session = createRowGuardSession()
  const heldBack = new Set<string>()

  for (const entry of getOutboxEntries(spreadsheetId)) {
    if (isQuotaBlocked() || isOffline()) {
      logSync('flush:blocked', isOffline() ? 'آفلاین' : 'محدودیت درخواست')

      return 'blocked'
    }
    // Waits for «کدام بماند؟»; never retried or reverted on its own.
    if (entry.conflict) continue
    if (heldBack.has(normalizeSheetTitle(entry.operation.sheetName))) continue

    const startedAt = Date.now()

    currentWrite = describeWrite(entry)
    markInFlight(entry.id)
    try {
      const written = await executeOutboxOperation(spreadsheetId, entry.operation, {
        session,
        isRetry: entry.attempts > 0
      })

      removeOutboxEntry(spreadsheetId, entry.id)
      logSync('write:ok', `${describeWrite(entry)} · ${Date.now() - startedAt}ms`)
      refreshPendingCount(spreadsheetId)
      // An edit may have followed its row into a yearly archive: stamp that tab.
      touched.add(written || entry.operation.sheetName)
      if (written && written !== entry.operation.sheetName) redirected.add(written)
    } catch (err) {
      if (err instanceof RowEditConflictError) {
        const { theirs, theirEmail, theirAt } = err

        logSync('write:conflict', describeWrite(entry))

        markOutboxEntryConflict(spreadsheetId, entry.id, { theirs, theirEmail, theirAt })
        refreshPendingCount(spreadsheetId)
        continue
      }

      const message = err instanceof Error ? err.message : 'خطا در همگام‌سازی'
      const permanent = err instanceof RowConflictError || isPermanentApiError(err)

      logSync(
        permanent ? 'write:rejected' : 'write:failed',
        `${describeWrite(entry)} · ${Date.now() - startedAt}ms · ${message}`
      )

      if (permanent && entry.operation.sheetName === ACTIVITY_SHEET) {
        // Two best-effort dates; the next app open rewrites them. Nothing to tell the user.
        removeOutboxEntry(spreadsheetId, entry.id)
        refreshPendingCount(spreadsheetId)
        continue
      }

      if (permanent) {
        // Otherwise the app keeps showing a change the sheet never got.
        const { revertFailedWrite } = await import('./failedWriteMirror')
        const reverted = revertFailedWrite(spreadsheetId, entry.operation)

        moveOutboxEntryToFailed(spreadsheetId, entry.id, message, { reverted })
        if (reverted) invalidateDerivedCaches(spreadsheetId)
        refreshPendingCount(spreadsheetId)
        refreshFailedCount(spreadsheetId)
        setSyncState('error', `یک تغییر اعمال نشد: ${toUserMessage(err, 'خطای نامشخص')}`)
        continue
      }

      markOutboxEntryFailed(spreadsheetId, entry.id, message)

      if (isQuotaExceededError(err)) {
        markQuotaExceeded()

        return 'blocked'
      }

      setSyncState('error', message)
      refreshPendingCount(spreadsheetId)

      // No HTTP answer at all (timeout, dropped connection): every tab would fail the same way.
      if (!(err instanceof SheetsApiError)) return 'blocked'

      heldBack.add(normalizeSheetTitle(entry.operation.sheetName))
    } finally {
      currentWrite = null
      clearInFlight(entry.id)
    }
  }

  return heldBack.size ? 'blocked' : 'done'
}

async function runFlush(spreadsheetId: string): Promise<boolean> {
  if (!hasPendingOutbox(spreadsheetId)) {
    refreshPendingCount(spreadsheetId)

    return true
  }

  setSyncState('syncing')
  logSync('flush:start', `${getOutboxCount(spreadsheetId)} تغییر در صف`)

  const startedAt = Date.now()
  const stallTimer = setTimeout(
    () => logSync('flush:stalled', currentWrite ?? 'درخواستی در جریان نیست'),
    STALL_WARNING_MS
  )

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
    clearTimeout(stallTimer)
    await announceWrites(spreadsheetId, touched, driveBefore, redirected)
    logSync(
      'flush:end',
      `${Date.now() - startedAt}ms · ${getOutboxCount(spreadsheetId)} باقی‌مانده`
    )
  }

  refreshPendingCount(spreadsheetId)
  if (!hasPendingOutbox(spreadsheetId)) {
    // A queue that reached the sheet is a sync too; the badge read «هنوز همگام نشده» until a pull.
    setSyncState('idle', null, touched.size > 0)
  }

  return !hasPendingOutbox(spreadsheetId)
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
