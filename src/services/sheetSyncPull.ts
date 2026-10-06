import type { AppSettings } from '../types'
import { checkRemoteChanged, rememberRemoteVersion } from './sheetRemoteVersion'
import { invalidateDerivedCaches } from './sheetSyncOutbox'
import { getKnownSheetNames } from './sheetSyncSheetNames'
import { getSheetWriteVersion, snapshotSheetWriteVersions } from './sheetWriteVersions'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { initStore, setManySheetAllRows, setStoreLastSyncedAt } from './spreadsheetStore'
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

  const remote = await checkRemoteChanged(spreadsheetId)

  if (
    options.skipIfUnchanged &&
    remote.skip &&
    options.hadData &&
    !hasPendingOutbox(spreadsheetId)
  ) {
    setSyncState('idle')

    return
  }

  const sheetNames = getKnownSheetNames(settings)

  const versionsBefore = snapshotSheetWriteVersions(spreadsheetId, sheetNames)

  const fetched = await fetchSheetsBatchFromApi(spreadsheetId, sheetNames)

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
