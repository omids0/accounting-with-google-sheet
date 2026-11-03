import type { DriveBackupFile, DriveBackupKind } from './autoBackupPlan'
import {
  deleteDriveFile,
  ensureSpreadsheetSiblingFolder,
  fetchDriveFileBlob,
  FILES_API,
  quoteQuery,
  uploadDriveFile
} from './driveFiles'
import { apiRequest } from './sheetsApi'

/** Round 7, Task I: full backups in Drive, «پشتیبان» next to the spreadsheet (`drive.file`). */
export const BACKUP_FOLDER_NAME = 'پشتیبان'

const MY_DRIVE_LABEL = 'درایو من'

/** `appProperties` keys: which spreadsheet a zip belongs to, and automatic or manual. */
const PROP_SPREADSHEET = 'acctSpreadsheet'

const PROP_KIND = 'acctBackup'

/** The app version that wrote a pre-update copy. */
const PROP_VERSION = 'acctVersion'

const ZIP_MIME = 'application/zip'

export interface DriveBackupFolder {
  id: string
  /** «Drive › حساب کتاب › پشتیبان» */
  label: string
}

async function folderName(folderId: string): Promise<string | null> {
  if (folderId === 'root') return MY_DRIVE_LABEL

  try {
    const data = await apiRequest<{ name?: string }>(
      `${FILES_API}/${encodeURIComponent(folderId)}?fields=name`
    )

    return data.name || null
  } catch {
    // drive.file cannot read a folder the app did not create.
    return null
  }
}

async function resolveBackupFolder(spreadsheetId: string): Promise<DriveBackupFolder> {
  const folder = await ensureSpreadsheetSiblingFolder(spreadsheetId, BACKUP_FOLDER_NAME)
  const parent = await folderName(folder.parentId)

  return {
    id: folder.id,
    label: ['Drive', ...(parent ? [parent] : []), BACKUP_FOLDER_NAME].join(' › ')
  }
}

const folderCache = new Map<string, Promise<DriveBackupFolder>>()

/** Created on first use, cached for the launch. */
export function getBackupFolder(spreadsheetId: string): Promise<DriveBackupFolder> {
  const cached = folderCache.get(spreadsheetId)

  if (cached) return cached

  const task = resolveBackupFolder(spreadsheetId)

  folderCache.set(spreadsheetId, task)
  task.catch(() => folderCache.delete(spreadsheetId))

  return task
}

interface DriveListedFile {
  id: string
  name: string
  size?: string
  createdTime?: string
  appProperties?: Record<string, string>
}

/** Anything the app did not mark as automatic or pre-update (older files too) is a manual copy. */
function kindOf(value: string | undefined): DriveBackupKind {
  return value === 'auto' || value === 'update-dev' || value === 'update-prod' ? value : 'manual'
}

export function toBackupFile(file: DriveListedFile): DriveBackupFile {
  const size = Number(file.size)

  return {
    id: file.id,
    name: file.name,
    size: Number.isFinite(size) ? size : undefined,
    createdAt: file.createdTime ? Date.parse(file.createdTime) : 0,
    kind: kindOf(file.appProperties?.[PROP_KIND]),
    ...(file.appProperties?.[PROP_VERSION] ? { appVersion: file.appProperties[PROP_VERSION] } : {})
  }
}

/** This spreadsheet's zips in the folder, newest first. */
export async function listDriveBackups(
  spreadsheetId: string,
  folderId: string
): Promise<DriveBackupFile[]> {
  const sheet = `key='${PROP_SPREADSHEET}' and value='${quoteQuery(spreadsheetId)}'`
  const q = encodeURIComponent(
    [
      `'${quoteQuery(folderId)}' in parents`,
      'trashed=false',
      `appProperties has { ${sheet} }`
    ].join(' and ')
  )
  const fields = encodeURIComponent('files(id,name,size,createdTime,appProperties),nextPageToken')
  const files: DriveBackupFile[] = []
  let pageToken: string | undefined

  do {
    const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
    const data = await apiRequest<{ files?: DriveListedFile[]; nextPageToken?: string }>(
      `${FILES_API}?q=${q}&fields=${fields}&orderBy=createdTime desc&pageSize=100${page}`
    )

    files.push(...(data.files ?? []).map(toBackupFile))
    pageToken = data.nextPageToken
  } while (pageToken)

  return files
}

export async function uploadDriveBackup(
  spreadsheetId: string,
  folderId: string,
  backup: { blob: Blob; name: string; exportedAt: Date },
  kind: DriveBackupKind,
  appVersion?: string
): Promise<DriveBackupFile> {
  const id = await uploadDriveFile(backup.blob, {
    name: backup.name,
    mimeType: ZIP_MIME,
    folderId,
    appProperties: {
      [PROP_SPREADSHEET]: spreadsheetId,
      [PROP_KIND]: kind,
      ...(appVersion ? { [PROP_VERSION]: appVersion } : {})
    }
  })

  return {
    id,
    name: backup.name,
    size: backup.blob.size,
    createdAt: backup.exportedAt.getTime(),
    kind,
    ...(appVersion ? { appVersion } : {})
  }
}

export { deleteDriveFile as deleteDriveBackup, fetchDriveFileBlob as downloadDriveBackup }
