import { getAccessToken } from './auth'
import { fetchWithTimeout } from './sheetsApi'
import { isAccountingSpreadsheetTitle } from './spreadsheetCatalog'

export const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

export type DriveFileAccess = Pick<DriveSpreadsheetFile, 'ownedByMe' | 'capabilities'>

export interface DriveSpreadsheetFile {
  id: string
  name: string
  modifiedTime: string
  /** False for a file another user shares with this one. Missing = not reported (treated as owned). */
  ownedByMe?: boolean
  capabilities?: { canEdit?: boolean }
}

/**
 * A file someone else owns and this user cannot edit: a child's account shared with a parent as
 * reader. It is never one of the user's own books, so it must not be registered or offered as one
 * just because its title says «حسابداری». Only a file Drive explicitly reports as both is one.
 */
export function isForeignReadOnlyFile(
  file: DriveFileAccess & Partial<DriveSpreadsheetFile>
): boolean {
  return file.ownedByMe === false && file.capabilities?.canEdit === false
}

export async function driveRequest<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${getAccessToken()}` }
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))

    throw new Error(
      (err as { error?: { message?: string } }).error?.message || `خطای Drive API: ${res.status}`
    )
  }

  return res.json() as Promise<T>
}

/** Who owns one file and whether this user can edit it (`files.get`): the check before a sheet is opened. */
export function getDriveFileAccess(fileId: string): Promise<DriveFileAccess> {
  const fields = encodeURIComponent('ownedByMe,capabilities/canEdit')

  return driveRequest(
    `${DRIVE_API}/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`
  )
}

export async function listAccountingSpreadsheetsFromDrive(): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains 'حسابداری'"
  )

  const fields = encodeURIComponent(
    'files(id,name,modifiedTime,ownedByMe,capabilities/canEdit),nextPageToken'
  )

  const results: DriveSpreadsheetFile[] = []

  let pageToken: string | undefined

  do {
    const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''

    const data = await driveRequest<{
      files?: DriveSpreadsheetFile[]
      nextPageToken?: string
    }>(`${DRIVE_API}?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=100${page}`)

    for (const file of data.files ?? []) {
      if (isAccountingSpreadsheetTitle(file.name)) {
        results.push(file)
      }
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return results.sort(
    (a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
  )
}
