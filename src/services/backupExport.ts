import { getArchiveTabs } from './archiveRegistry'
import { BACKUP_EXCLUDED_SHEETS, tabToBackupCsv } from './backupPlan'
import { markBackupDone } from './backupReminder'
import { buildBackupManifest, packBackup, type BackupTabFile } from './backupZip'
import { normalizeSheetTitle } from './sheetsMeta'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { flushOutbox } from './sheetSyncOutbox'
import { getAllSheetSpecs } from './spreadsheetSetup'
import { hasPendingOutbox } from './syncOutbox'
import { version as APP_VERSION } from '../../package.json'
import { exportFileName, saveExportFile } from '../utils/saveFile'

/** `saveExportFile` appends the Jalali date: «حساب کتاب · پشتیبان · ۱۴۰۵-۰۷-۲۰.zip». */
const BACKUP_FILE_NAME = 'حساب کتاب · پشتیبان ·.zip'

export const PENDING_WRITES_MESSAGE =
  'چند تغییر هنوز به Google Sheets نرسیده؛ بعد از همگام‌سازی دوباره امتحان کن.'

export interface BackupTab {
  name: string
  headers: string[]
}

/**
 * Every tab the app knows: the record forms and the module registry
 * (`moduleSheetSpecs`), so a tab added later is backed up with no change here,
 * plus this spreadsheet's yearly archives.
 */
export function listBackupTabs(spreadsheetId: string): BackupTab[] {
  const tabs: BackupTab[] = [
    ...getAllSheetSpecs(spreadsheetId).map(spec => ({
      name: spec.sheetName,
      headers: spec.headers
    })),
    ...getArchiveTabs(spreadsheetId).map(name => ({ name, headers: [] }))
  ]

  const seen = new Set<string>()

  return tabs.filter(tab => {
    const key = normalizeSheetTitle(tab.name)

    if (seen.has(key) || BACKUP_EXCLUDED_SHEETS.includes(tab.name)) return false
    seen.add(key)

    return true
  })
}

/** Backup and restore work on Google Sheets directly, so queued edits go first. */
export async function sendPendingWrites(spreadsheetId: string): Promise<void> {
  await flushOutbox(spreadsheetId)
  if (hasPendingOutbox(spreadsheetId)) throw new Error(PENDING_WRITES_MESSAGE)
}

/** Fresh rows of `names`, keyed by normalised title (missing tabs are absent). */
export async function fetchTabsByTitle(
  spreadsheetId: string,
  names: string[]
): Promise<Map<string, string[][]>> {
  const fetched = await batchFetchSheetRangesFromApi(spreadsheetId, names)

  return new Map([...fetched].map(([name, rows]) => [normalizeSheetTitle(name), rows]))
}

export interface FullBackup {
  blob: Blob
  /** «حساب کتاب · پشتیبان · ۱۴۰۵-۰۷-۲۰.zip» */
  name: string
  exportedAt: Date
}

/** Every tab as CSV plus `manifest.json`, zipped; nothing saved yet. */
export async function buildFullBackup(
  spreadsheetId: string,
  spreadsheetLabel: string
): Promise<FullBackup> {
  await sendPendingWrites(spreadsheetId)

  const tabs = listBackupTabs(spreadsheetId)

  const rowsByTitle = await fetchTabsByTitle(
    spreadsheetId,
    tabs.map(tab => tab.name)
  )

  const files: BackupTabFile[] = tabs.map(tab => ({
    name: tab.name,
    ...tabToBackupCsv(rowsByTitle.get(normalizeSheetTitle(tab.name)) ?? [], tab.headers)
  }))

  const exportedAt = new Date()

  const manifest = buildBackupManifest(files, {
    appVersion: APP_VERSION,
    spreadsheetLabel,
    exportedAt
  })

  return {
    blob: new Blob([packBackup(manifest, files)], { type: 'application/zip' }),
    name: exportFileName(BACKUP_FILE_NAME, exportedAt),
    exportedAt
  }
}

/** Saves a built backup on this device; null when the share sheet was closed. */
export async function saveFullBackup(spreadsheetId: string, backup: FullBackup) {
  const saved = await saveExportFile(BACKUP_FILE_NAME, backup.blob)

  if (saved) markBackupDone(spreadsheetId, backup.exportedAt.getTime())

  return saved
}

/** Zips every tab and saves it; null when the share sheet was closed. */
export async function createFullBackup(
  spreadsheetId: string,
  spreadsheetLabel: string
): Promise<string | null> {
  return saveFullBackup(spreadsheetId, await buildFullBackup(spreadsheetId, spreadsheetLabel))
}
