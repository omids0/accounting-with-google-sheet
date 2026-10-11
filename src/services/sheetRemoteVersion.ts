import { apiRequest } from './sheetsApi'
import { getSyncMeta, updateSyncMeta } from './spreadsheetSyncMeta'

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files'

/** Drive's modifiedTime for the spreadsheet, or null when it cannot be read. */
export async function fetchRemoteModifiedTime(spreadsheetId: string): Promise<string | null> {
  try {
    const data = await apiRequest<{ modifiedTime?: string }>(
      `${DRIVE_FILES_API}/${encodeURIComponent(
        spreadsheetId
      )}?fields=modifiedTime&supportsAllDrives=true`
    )

    return data.modifiedTime ?? null
  } catch {
    return null
  }
}

/**
 * A tiny metadata call that tells whether anything outside the change tokens
 * (a hand edit in Google Sheets) may have changed the file since the mirror
 * was taken. When Drive cannot be read, change tokens alone decide.
 */
export async function checkRemoteChanged(
  spreadsheetId: string
): Promise<{ driveChanged: boolean; modifiedTime: string | null }> {
  const modifiedTime = await fetchRemoteModifiedTime(spreadsheetId)

  if (!modifiedTime) return { driveChanged: false, modifiedTime }

  return {
    driveChanged: getSyncMeta(spreadsheetId)?.modifiedTime !== modifiedTime,
    modifiedTime
  }
}

/** Persisted with the mirror, so a restart still knows which file version it holds. */
export function rememberRemoteVersion(spreadsheetId: string, modifiedTime: string | null): void {
  updateSyncMeta(spreadsheetId, { modifiedTime })
}

export function forgetRemoteVersion(spreadsheetId: string): void {
  updateSyncMeta(spreadsheetId, { modifiedTime: null })
}
