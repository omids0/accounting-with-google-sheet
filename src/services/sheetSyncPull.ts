import type { AppSettings } from '../types'
import { checkRemoteChanged, rememberRemoteVersion } from './sheetRemoteVersion'
import type { RevisionMap } from './sheetRevisions'
import { fetchSheetRevisions, findChangedSheets, markSheetsSeen } from './sheetRevisions'
import { missingSheetNames } from './sheetsMeta'
import { invalidateDerivedCaches, reviveMissingTabAppends } from './sheetSyncOutbox'
import { planSheetFetch, type SheetFetchPlan } from './sheetSyncPlan'
import { getKnownSheetNames } from './sheetSyncSheetNames'
import { getSheetWriteVersion, snapshotSheetWriteVersions } from './sheetWriteVersions'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import {
  initStore,
  setManySheetAllRows,
  setSheetAllRows,
  setStoreLastSyncedAt
} from './spreadsheetStore'
import { getSyncMeta, updateSyncMeta } from './spreadsheetSyncMeta'
import { getOutboxSheetNames, hasPendingOutbox } from './syncOutbox'
import { setLastSyncedAt, setSyncState } from './syncStatus'

async function fetchSheetsBatchFromApi(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[][]>> {
  const { batchFetchSheetRangesFromApi } = await import('./sheets')

  return batchFetchSheetRangesFromApi(spreadsheetId, sheetNames)
}

function recordPullOutcome(
  spreadsheetId: string,
  plan: SheetFetchPlan,
  modifiedTime: string | null
): void {
  rememberRemoteVersion(spreadsheetId, modifiedTime)

  if (plan.full) {
    updateSyncMeta(spreadsheetId, { fullSyncAt: Date.now(), absorbedAt: null })
  } else if (plan.absorbs && getSyncMeta(spreadsheetId)?.absorbedAt == null) {
    updateSyncMeta(spreadsheetId, { absorbedAt: Date.now() })
  }
}

function changedSheets(
  spreadsheetId: string,
  allSheets: string[],
  revisions: RevisionMap | null
): string[] | null {
  return revisions ? findChangedSheets(spreadsheetId, allSheets, revisions) : null
}

/**
 * Downloads every known sheet and merges it into the local mirror, skipping
 * sheets that still have queued writes or were written locally while the
 * download was in flight.
 */
export async function pullRemoteSheets(
  spreadsheetId: string,
  settings: AppSettings,
  options: { skipIfUnchanged?: boolean; hadData: boolean }
): Promise<void> {
  initStore(spreadsheetId)

  // Both are tiny metadata reads; together they say which tabs changed.
  const [remote, revisions] = await Promise.all([
    checkRemoteChanged(spreadsheetId),
    fetchSheetRevisions(spreadsheetId).catch(() => null)
  ])

  const allSheets = getKnownSheetNames(settings)

  const plan = planSheetFetch({
    allSheets,
    allowPartial: Boolean(options.skipIfUnchanged),
    hadData: options.hadData,
    changed: changedSheets(spreadsheetId, allSheets, revisions),
    driveChanged: remote.driveChanged,
    fullSyncAt: getSyncMeta(spreadsheetId)?.fullSyncAt ?? null,
    absorbedAt: getSyncMeta(spreadsheetId)?.absorbedAt ?? null,
    now: Date.now()
  })

  if (!plan.sheets.length) {
    // Nothing changed remotely: the mirror is current as of this check.
    const now = Date.now()

    setStoreLastSyncedAt(spreadsheetId, now)
    setLastSyncedAt(now)
    if (!hasPendingOutbox(spreadsheetId)) setSyncState('idle')

    return
  }

  const sheetNames = plan.sheets

  const versionsBefore = snapshotSheetWriteVersions(spreadsheetId, sheetNames)

  // A write queued now may be sent while the download is in flight; its tab
  // would then look unblocked afterwards and the older copy would win.
  const blockedBefore = getOutboxSheetNames(spreadsheetId)

  const fetched = await fetchSheetsBatchFromApi(spreadsheetId, sheetNames)
  const missing = missingSheetNames(sheetNames, fetched.keys())

  if (missing.length) {
    // Download skipped them; create them so the next sync covers them too.
    void import('./spreadsheetSetup')
      .then(({ repairMissingSheets }) => repairMissingSheets(spreadsheetId, missing))
      .catch(() => undefined)
  }

  // Rows written while their tab was missing were parked, then the empty tab replaced
  // them locally: send them again and keep them visible until they land.
  const revived = reviveMissingTabAppends(spreadsheetId, fetched)

  for (const [sheetName, rows] of revived) setSheetAllRows(spreadsheetId, sheetName, rows)
  if (revived.size) queueMicrotask(() => notifySpreadsheetDataChanged(spreadsheetId))

  // Checked after the fetch: a local write made while it was in flight must
  // not be overwritten by the older copy that just arrived.
  const stillBlocked = getOutboxSheetNames(spreadsheetId)

  const filtered = new Map<string, string[][]>()

  for (const [sheetName, rows] of fetched) {
    if (blockedBefore.has(sheetName) || stillBlocked.has(sheetName)) continue
    if (getSheetWriteVersion(spreadsheetId, sheetName) !== versionsBefore.get(sheetName)) continue
    filtered.set(sheetName, rows)
  }

  // A skipped tab was not refreshed: keep the old Drive time and safety nets so
  // a hand edit on it is still downloaded later.
  if (![...fetched.keys()].some(name => !filtered.has(name))) {
    recordPullOutcome(spreadsheetId, plan, remote.modifiedTime)
  }
  if (revisions) markSheetsSeen(spreadsheetId, [...filtered.keys()], revisions)

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
    queueMicrotask(() => notifySpreadsheetDataChanged(spreadsheetId))
  } else if (!hasPendingOutbox(spreadsheetId)) {
    setSyncState('idle')
  }
}
