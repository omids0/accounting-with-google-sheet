import { apiRequest } from './sheetsApi'

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files'

/** Even when Drive reports no change, re-download at least this often. */
const MAX_TRUSTED_AGE_MS = 10 * 60_000

interface RemoteVersion {
  modifiedTime: string
  checkedAt: number
}

const lastSeen = new Map<string, RemoteVersion>()

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
 * A tiny metadata call that tells a focus/poll sync whether the 30-sheet
 * download is needed at all. Returns the modifiedTime to remember after a
 * successful download, or `skip` when nothing changed since the last one.
 */
export async function checkRemoteChanged(
  spreadsheetId: string
): Promise<{ skip: boolean; modifiedTime: string | null }> {
  const modifiedTime = await fetchRemoteModifiedTime(spreadsheetId)

  const previous = lastSeen.get(spreadsheetId)

  const fresh = previous && Date.now() - previous.checkedAt < MAX_TRUSTED_AGE_MS

  return {
    skip: Boolean(modifiedTime && fresh && previous?.modifiedTime === modifiedTime),
    modifiedTime
  }
}

export function rememberRemoteVersion(spreadsheetId: string, modifiedTime: string | null): void {
  if (!modifiedTime) {
    lastSeen.delete(spreadsheetId)

    return
  }
  lastSeen.set(spreadsheetId, { modifiedTime, checkedAt: Date.now() })
}

export function forgetRemoteVersion(spreadsheetId: string): void {
  lastSeen.delete(spreadsheetId)
}
