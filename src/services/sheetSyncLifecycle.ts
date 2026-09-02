import type { AppSettings } from '../types'
import { CATEGORIES_SHEET } from './categories'
import { CHECKS_SHEET } from './checks'
import { DANG_SHEET } from './dang'
import { INSTALLMENTS_SHEET } from './installments'
import { MONTHLY_BALANCE_SHEET } from './monthlyBalance'
import { RECEIVABLES_SHEET } from './receivables'
import { REMINDERS_SHEET, PUSH_SUBS_SHEET } from './reminders'
import { getSettings } from './settings'
import { isQuotaExceededError } from './sheets'
import { flushOutbox, invalidateDerivedCaches, isQuotaBlocked } from './sheetSyncOutbox'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import {
  clearStore,
  getStoreLastSyncedAt,
  hasStoreData,
  initStore,
  setManySheetAllRows,
  setStoreLastSyncedAt
} from './spreadsheetStore'
import { getOutboxSheetNames, hasPendingOutbox, clearOutbox, getOutboxCount } from './syncOutbox'
import { getSyncStatus, setLastSyncedAt, setSyncState, setPendingWrites } from './syncStatus'
import { TIMESHEETS_SHEET, TIMESHEET_ENTRIES_SHEET } from './timesheet'
import { TREASURY_SHEET } from './treasury'
import { WALLET_SHEET } from './wallet'

const SYNC_INTERVAL_MS = 120_000

const MIN_SYNC_COOLDOWN_MS = 30_000

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
  TIMESHEETS_SHEET,
  TIMESHEET_ENTRIES_SHEET
]

let activeSpreadsheetId: string | null = null

let syncTimer: ReturnType<typeof setInterval> | null = null

let fullSyncInFlight: Promise<void> | null = null

export function getKnownSheetNames(settings: AppSettings = getSettings()!): string[] {
  if (!settings) return [...STATIC_SHEETS]

  const formSheets = settings.forms.map(form => form.sheetName)

  return [...new Set([...formSheets, ...STATIC_SHEETS])]
}

function isSyncCoolingDown(spreadsheetId: string): boolean {
  if (isQuotaBlocked()) return true

  const lastSyncedAt = getStoreLastSyncedAt(spreadsheetId)

  if (!lastSyncedAt) return false

  return Date.now() - lastSyncedAt < MIN_SYNC_COOLDOWN_MS
}

async function fetchSheetsBatchFromApi(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[][]>> {
  const { batchFetchSheetRangesFromApi } = await import('./sheets')

  return batchFetchSheetRangesFromApi(spreadsheetId, sheetNames)
}

export async function fullSyncFromRemote(
  spreadsheetId: string,
  options: { background?: boolean; force?: boolean } = {}
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

      const stillBlocked = getOutboxSheetNames(spreadsheetId)

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncState('idle')

        return
      }

      initStore(spreadsheetId)

      const sheetNames = getKnownSheetNames(settings)

      const fetched = await fetchSheetsBatchFromApi(spreadsheetId, sheetNames)

      const filtered = new Map<string, string[][]>()

      for (const [sheetName, rows] of fetched) {
        if (stillBlocked.has(sheetName)) continue
        filtered.set(sheetName, rows)
      }

      if (!filtered.size) {
        if (!hasPendingOutbox(spreadsheetId)) {
          setSyncState('idle')
        }

        return
      }

      const changed = setManySheetAllRows(spreadsheetId, filtered)

      const now = Date.now()

      setStoreLastSyncedAt(spreadsheetId, now)
      setLastSyncedAt(now)

      if (changed) {
        invalidateDerivedCaches(spreadsheetId)
        notifySpreadsheetDataChanged(spreadsheetId)
      } else if (!hasPendingOutbox(spreadsheetId)) {
        setSyncState('idle')
      }
    } catch (err) {
      if (isQuotaExceededError(err)) {
        const { markQuotaExceeded } = await import('./sheetSyncOutbox')

        markQuotaExceeded()

        return
      }

      const message = err instanceof Error ? err.message : 'خطا در دریافت داده'

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

  void fullSyncFromRemote(id, { background: true, force: options.force }).catch(() => {
    /* error state handled in fullSyncFromRemote */
  })
}

export async function initializeSheetSync(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId) return

  activeSpreadsheetId = spreadsheetId
  initStore(spreadsheetId)
  setPendingWrites(getOutboxCount(spreadsheetId))

  const lastSyncedAt = getStoreLastSyncedAt(spreadsheetId)

  if (lastSyncedAt) {
    setLastSyncedAt(lastSyncedAt)
  }

  if (hasStoreData(spreadsheetId)) {
    if (hasPendingOutbox(spreadsheetId)) {
      void flushOutbox(spreadsheetId).then(() => {
        void fullSyncFromRemote(spreadsheetId, { background: true, force: true })
      })
    } else {
      void fullSyncFromRemote(spreadsheetId, { background: true, force: true })
    }
  } else {
    await fullSyncFromRemote(spreadsheetId, { background: false, force: true })
  }

  if (syncTimer) clearInterval(syncTimer)
  syncTimer = setInterval(() => {
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

export function resetSheetSync(spreadsheetId: string): void {
  stopSheetSync()
  clearStore(spreadsheetId)
  clearOutbox(spreadsheetId)
  setPendingWrites(0)
  invalidateDerivedCaches(spreadsheetId)
  notifySpreadsheetDataChanged(spreadsheetId)
}

export function onPageEnter(): void {
  if (!activeSpreadsheetId) return
  void flushOutbox(activeSpreadsheetId).then(flushed => {
    if (flushed) {
      refreshInBackground(activeSpreadsheetId ?? undefined)
    }
  })
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
