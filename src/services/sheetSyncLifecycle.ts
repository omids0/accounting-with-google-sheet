import { getSettings } from './settings'
import { forgetRemoteVersion } from './sheetRemoteVersion'
import { forgetSheetRevisions } from './sheetRevisions'
import { isQuotaExceededError } from './sheets'
import {
  flushOutbox,
  invalidateDerivedCaches,
  isQuotaBlocked,
  refreshFailedCount,
  refreshPendingCount
} from './sheetSyncOutbox'
import { pullRemoteSheets } from './sheetSyncPull'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { clearStore, getStoreLastSyncedAt, hasStoreData, hydrateStore } from './spreadsheetStore'
import { getOutboxSheetNames, hasPendingOutbox, clearOutbox } from './syncOutbox'
import { getSyncStatus, setLastSyncedAt, setSyncState, setPendingWrites } from './syncStatus'
import { toUserMessage } from '../utils/userMessage'

/**
 * A poll is two tiny metadata reads unless a tab really changed, so changes
 * from another device show up within half a minute. Per open device that is
 * about 2 Sheets reads a minute (plus 2 on Drive's separate quota), well under
 * Sheets' 60 reads per user per minute even with several devices open.
 */
export const SYNC_INTERVAL_MS = 30_000

const MIN_SYNC_COOLDOWN_MS = 15_000

/** A cached mirror plus persisted change tokens: download only what changed since. */
const COLD_START_WITH_MIRROR = { background: true, force: true, skipIfUnchanged: true }

/**
 * Focus-triggered syncs bypass the cooldown but not faster than this. They are
 * cheap now: a Drive modifiedTime check decides whether to download anything.
 */
const FOCUS_SYNC_THROTTLE_MS = 10_000

let activeSpreadsheetId: string | null = null

let syncTimer: ReturnType<typeof setInterval> | null = null

let fullSyncInFlight: Promise<void> | null = null

let lastFocusSyncAt = 0

let visibilityListenerBound = false

function isSyncCoolingDown(spreadsheetId: string): boolean {
  if (isQuotaBlocked()) return true

  const lastSyncedAt = getStoreLastSyncedAt(spreadsheetId)

  if (!lastSyncedAt) return false

  return Date.now() - lastSyncedAt < MIN_SYNC_COOLDOWN_MS
}

export async function fullSyncFromRemote(
  spreadsheetId: string,
  options: { background?: boolean; force?: boolean; skipIfUnchanged?: boolean } = {}
): Promise<void> {
  if (!spreadsheetId) return
  if (isQuotaBlocked()) return

  const force = options.force ?? false

  if (!force && isSyncCoolingDown(spreadsheetId) && !hasPendingOutbox(spreadsheetId)) {
    return
  }

  if (fullSyncInFlight) {
    await fullSyncInFlight

    return
  }

  const settings = getSettings()

  if (!settings) return

  const background = options.background ?? false

  const hadData = hasStoreData(spreadsheetId)

  if (!background || !hadData) {
    setSyncState('syncing')
  }

  const task = (async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await flushOutbox(spreadsheetId)
      }

      const blockedSheets = getOutboxSheetNames(spreadsheetId)

      if (blockedSheets.size > 0 && typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncState('idle')

        return
      }

      if (blockedSheets.size > 0) {
        const flushed = await flushOutbox(spreadsheetId)

        if (!flushed) {
          return
        }
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncState('idle')

        return
      }

      await pullRemoteSheets(spreadsheetId, settings, {
        skipIfUnchanged: options.skipIfUnchanged,
        hadData
      })
      // Runs once per spreadsheet, right after a pull while the local mirror is fresh.
      void import('./migrateCompactGrids')
        .then(({ migrateCompactGrids }) => migrateCompactGrids(spreadsheetId))
        .catch(() => undefined)
      // Free unless a form tab is over the archive threshold (checked on the mirror).
      void import('./recordArchiveSweep')
        .then(({ sweepArchivesAfterPull }) =>
          sweepArchivesAfterPull(spreadsheetId, settings.forms ?? [])
        )
        .catch(() => undefined)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        const { markQuotaExceeded } = await import('./sheetSyncOutbox')

        markQuotaExceeded()

        return
      }

      const message = toUserMessage(err, 'خطا در دریافت داده')

      setSyncState('error', message)
      throw err
    }
  })()

  fullSyncInFlight = task.finally(() => {
    fullSyncInFlight = null
  })

  await fullSyncInFlight
}

export function refreshInBackground(
  spreadsheetId?: string,
  options: { force?: boolean } = {}
): void {
  const id = spreadsheetId ?? activeSpreadsheetId

  if (!id) return

  if (getSyncStatus().syncState === 'syncing') return
  if (!options.force && isSyncCoolingDown(id) && !hasPendingOutbox(id)) return

  // Background refreshes first ask Drive whether anything changed at all.
  void fullSyncFromRemote(id, {
    background: true,
    force: options.force,
    skipIfUnchanged: true
  }).catch(() => {
    /* error state handled in fullSyncFromRemote */
  })
}

export async function initializeSheetSync(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId) return

  activeSpreadsheetId = spreadsheetId
  // App start may already have hydrated it to show cached data; re-reading IndexedDB
  // then would drop writes made since that are not persisted yet.
  if (!hasStoreData(spreadsheetId)) await hydrateStore(spreadsheetId)
  void import('./spreadsheetPrepare')
    .then(prepare => prepare.runBackgroundMigrations(spreadsheetId))
    .catch(() => undefined)
  refreshPendingCount(spreadsheetId)
  refreshFailedCount(spreadsheetId)

  const lastSyncedAt = getStoreLastSyncedAt(spreadsheetId)

  if (lastSyncedAt) {
    setLastSyncedAt(lastSyncedAt)
  }

  if (hasStoreData(spreadsheetId)) {
    if (hasPendingOutbox(spreadsheetId)) {
      void flushOutbox(spreadsheetId).then(() => {
        void fullSyncFromRemote(spreadsheetId, COLD_START_WITH_MIRROR)
      })
    } else {
      void fullSyncFromRemote(spreadsheetId, COLD_START_WITH_MIRROR)
    }
  } else {
    await fullSyncFromRemote(spreadsheetId, { background: false, force: true })
  }
  void import('./sharing').then(sharing => sharing.refreshSharingInfoIfStale(spreadsheetId))

  bindVisibilitySync()

  if (syncTimer) clearInterval(syncTimer)
  syncTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    refreshInBackground(spreadsheetId)
  }, SYNC_INTERVAL_MS)
}

export function stopSheetSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  activeSpreadsheetId = null
}

/**
 * `keepOutbox`: leaving a sheet with unsent changes keeps them queued under its
 * id, so they go out the next time that sheet is opened.
 */
export function resetSheetSync(
  spreadsheetId: string,
  { keepOutbox = false }: { keepOutbox?: boolean } = {}
): void {
  stopSheetSync()
  forgetRemoteVersion(spreadsheetId)
  forgetSheetRevisions(spreadsheetId)
  clearStore(spreadsheetId)
  if (!keepOutbox) clearOutbox(spreadsheetId)
  setPendingWrites(0)
  setSyncState('idle')
  invalidateDerivedCaches(spreadsheetId)
  notifySpreadsheetDataChanged(spreadsheetId)
}

/**
 * Pulls remote changes as soon as the user comes back to the app. Polling alone
 * left a second device up to two minutes stale, which reads as a bug even though
 * the data was queued correctly.
 */
export function onPageEnter(): void {
  if (!activeSpreadsheetId) return

  const now = Date.now()

  if (now - lastFocusSyncAt < FOCUS_SYNC_THROTTLE_MS) return

  lastFocusSyncAt = now

  const spreadsheetId = activeSpreadsheetId

  void flushOutbox(spreadsheetId).finally(() => {
    refreshInBackground(spreadsheetId, { force: true })
  })
}

function bindVisibilitySync(): void {
  if (visibilityListenerBound || typeof document === 'undefined') return

  visibilityListenerBound = true

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onPageEnter()
  })
  window.addEventListener('focus', onPageEnter)
}

export function getActiveSpreadsheetId(): string | null {
  return activeSpreadsheetId
}

export async function retryPendingWrites(spreadsheetId?: string): Promise<void> {
  const id = spreadsheetId ?? activeSpreadsheetId

  if (!id) return

  const flushed = await flushOutbox(id)

  if (flushed) {
    await fullSyncFromRemote(id, { background: true, force: true })
  }
}
