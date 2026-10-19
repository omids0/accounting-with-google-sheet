/** Change-token bookkeeping around an outbox flush (split from sheetSyncOutbox). */

/** Drive's modifiedTime right before this device writes; null when unreadable. */
export async function readDriveTime(spreadsheetId: string): Promise<string | null> {
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
export async function announceWrites(
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

    try {
      await stampSheetRevisions(spreadsheetId, touched)
    } finally {
      // A write that followed its row into an archive changed that tab only
      // remotely: download it again rather than trust the local copy.
      if (redirected.size) forgetSeenSheets(spreadsheetId, redirected)
    }

    if (driveBefore && driveBefore === getSyncMeta(spreadsheetId)?.modifiedTime) {
      rememberRemoteVersion(spreadsheetId, await fetchRemoteModifiedTime(spreadsheetId))
    }
  } catch {
    /* change detection falls back to a full download */
  }
}
