import type { AppSettings } from '../types'
import { checkRemoteChanged, rememberRemoteVersion } from './sheetRemoteVersion'
import type { RevisionMap } from './sheetRevisions'
import { fetchSheetRevisions, findChangedSheets, markSheetsSeen } from './sheetRevisions'
import { missingSheetNames } from './sheetsMeta'
import { invalidateDerivedCaches, reviveMissingTabAppends } from './sheetSyncOutbox'
import { getKnownSheetNames } from './sheetSyncSheetNames'
import { getSheetWriteVersion, snapshotSheetWriteVersions } from './sheetWriteVersions'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import {
  initStore,
  setManySheetAllRows,
  setSheetAllRows,
  setStoreLastSyncedAt
} from './spreadsheetStore'
import { getOutboxSheetNames, hasPendingOutbox } from './syncOutbox'
import { setLastSyncedAt, setSyncState } from './syncStatus'

async function fetchSheetsBatchFromApi(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[][]>> {
  const { batchFetchSheetRangesFromApi } = await import('./sheets')

  return batchFetchSheetRangesFromApi(spreadsheetId, sheetNames)
}

/**
 * Background refreshes download only the tabs whose change token moved. When
 * Drive says the file changed but no token moved, someone edited the sheet by
 * hand (or an older app version wrote to it), so everything is downloaded.
 */
function pickSheetsToFetch(
  spreadsheetId: string,
  allSheets: string[],
  options: { skipIfUnchanged?: boolean; hadData: boolean; revisions: RevisionMap | null }
): string[] {
  if (!options.skipIfUnchanged || !options.hadData || !options.revisions) return allSheets

  const changed = findChangedSheets(spreadsheetId, allSheets, options.revisions)

  return changed?.length ? changed : allSheets
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

  // Both are tiny metadata reads; the token map is unused when nothing changed.
  const [remote, revisions] = await Promise.all([
    checkRemoteChanged(spreadsheetId),
    fetchSheetRevisions(spreadsheetId).catch(() => null)
  ])

  if (
    options.skipIfUnchanged &&
    remote.skip &&
    options.hadData &&
    !hasPendingOutbox(spreadsheetId)
  ) {
    setSyncState('idle')

    return
  }

  const sheetNames = pickSheetsToFetch(spreadsheetId, getKnownSheetNames(settings), {
    ...options,
    revisions
  })

  const versionsBefore = snapshotSheetWriteVersions(spreadsheetId, sheetNames)

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
    if (stillBlocked.has(sheetName)) continue
    if (getSheetWriteVersion(spreadsheetId, sheetName) !== versionsBefore.get(sheetName)) continue
    filtered.set(sheetName, rows)
  }

  rememberRemoteVersion(spreadsheetId, remote.modifiedTime)
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
