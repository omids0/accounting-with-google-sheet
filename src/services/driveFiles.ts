import { getAccessToken, isTokenValid } from './auth'
import { apiRequest, SheetsApiError } from './sheetsApi'

/**
 * Receipt files on Drive with the existing `drive.file` scope: the app sees
 * only what it created, so folders are found by name under a known parent.
 */
const FILES_API = 'https://www.googleapis.com/drive/v3/files'

const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

export const ATTACHMENTS_FOLDER_NAME = 'پیوست‌ها'

export interface DriveFileInfo {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

/** «۱۴۰۵»: the yearly sub-folder name, the same on every device. */
export function yearFolderName(year: number): string {
  return String(year).replace(/\d/g, digit => PERSIAN_DIGITS[Number(digit)])
}

/** Drive's multipart upload body: JSON metadata, then the file bytes. */
export function buildMultipartBody(
  metadata: Record<string, unknown>,
  file: Blob,
  mimeType: string,
  boundary: string
): { body: Blob; contentType: string } {
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`
  ])

  return { body, contentType: `multipart/related; boundary=${boundary}` }
}

function quoteQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function findFolder(name: string, parentId: string): Promise<string | null> {
  const q = encodeURIComponent(
    `mimeType='${FOLDER_MIME}' and name='${quoteQuery(name)}' and '${quoteQuery(
      parentId
    )}' in parents and trashed=false`
  )
  const data = await apiRequest<{ files?: { id: string }[] }>(
    `${FILES_API}?q=${q}&fields=files(id)&pageSize=1`
  )

  return data.files?.[0]?.id ?? null
}

async function createFolder(name: string, parentId: string): Promise<string> {
  const data = await apiRequest<{ id: string }>(`${FILES_API}?fields=id`, {
    method: 'POST',
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] })
  })

  return data.id
}

async function ensureFolder(name: string, parentId: string): Promise<string> {
  return (await findFolder(name, parentId)) ?? (await createFolder(name, parentId))
}

/** The folder holding the spreadsheet; «My Drive» when Drive does not say or allow it. */
async function spreadsheetParent(spreadsheetId: string): Promise<string> {
  try {
    const data = await apiRequest<{ parents?: string[] }>(
      `${FILES_API}/${encodeURIComponent(spreadsheetId)}?fields=parents`
    )

    return data.parents?.[0] ?? 'root'
  } catch {
    return 'root'
  }
}

const folderCache = new Map<string, Promise<string>>()

async function resolveYearFolder(spreadsheetId: string, year: number): Promise<string> {
  const parent = await spreadsheetParent(spreadsheetId)
  let root: string

  try {
    root = await ensureFolder(ATTACHMENTS_FOLDER_NAME, parent)
  } catch (err) {
    // drive.file may not write into a folder the app never opened: use My Drive.
    if (parent === 'root') throw err
    root = await ensureFolder(ATTACHMENTS_FOLDER_NAME, 'root')
  }

  return ensureFolder(yearFolderName(year), root)
}

/** «پیوست‌ها/<year>» next to the spreadsheet, created on first use and cached. */
export function getAttachmentFolder(spreadsheetId: string, year: number): Promise<string> {
  const key = `${spreadsheetId}:${year}`
  const cached = folderCache.get(key)

  if (cached) return cached

  const task = resolveYearFolder(spreadsheetId, year)

  folderCache.set(key, task)
  task.catch(() => folderCache.delete(key))

  return task
}

export async function uploadDriveFile(
  file: Blob,
  { name, mimeType, folderId }: { name: string; mimeType: string; folderId: string }
): Promise<string> {
  const { body, contentType } = buildMultipartBody(
    { name, mimeType, parents: [folderId] },
    file,
    mimeType,
    `acct-${crypto.randomUUID()}`
  )
  const data = await apiRequest<{ id: string }>(`${UPLOAD_API}?uploadType=multipart&fields=id`, {
    method: 'POST',
    body,
    headers: { 'Content-Type': contentType }
  })

  if (!data.id) throw new Error('Drive شناسهٔ فایل را برنگرداند.')

  return data.id
}

/** A file already gone (deleted by hand, or on another device) counts as deleted. */
export async function deleteDriveFile(fileId: string): Promise<void> {
  try {
    await apiRequest(`${FILES_API}/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
  } catch (err) {
    if (err instanceof SheetsApiError && err.status === 404) return
    throw err
  }
}

/** Best effort: a file that could not be removed stays in Drive, nothing else breaks. */
export async function deleteDriveFiles(fileIds: readonly string[]): Promise<number> {
  const results = await Promise.allSettled(fileIds.map(deleteDriveFile))

  return results.filter(result => result.status === 'rejected').length
}

const infoCache = new Map<string, Promise<DriveFileInfo>>()

export function fetchDriveFileInfo(fileId: string): Promise<DriveFileInfo> {
  const cached = infoCache.get(fileId)

  if (cached) return cached

  const task = apiRequest<DriveFileInfo>(
    `${FILES_API}/${encodeURIComponent(fileId)}?fields=id,name,mimeType,webViewLink`
  )

  infoCache.set(fileId, task)
  task.catch(() => infoCache.delete(fileId))

  return task
}

/** The bytes, with the token (a thumbnail link would need Google cookies the app lacks). */
export async function fetchDriveFileBlob(fileId: string): Promise<Blob> {
  if (!isTokenValid()) {
    const { ensureFreshAccessToken } = await import('./tokenRefresh')

    await ensureFreshAccessToken()
  }

  const res = await fetch(`${FILES_API}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` }
  })

  if (!res.ok) throw new SheetsApiError(`خطای Drive: ${res.status}`, res.status)

  return res.blob()
}

export function driveViewLink(info: Pick<DriveFileInfo, 'id' | 'webViewLink'>): string {
  return info.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(info.id)}/view`
}
