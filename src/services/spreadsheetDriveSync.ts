import type { SpreadsheetEntry } from '../types'
import { listAccountingSpreadsheetsFromDrive, type DriveSpreadsheetFile } from './drive'
import { getDefaultSettings, getSettings, saveSettings } from './settings'

function driveFileToEntry(file: DriveSpreadsheetFile): SpreadsheetEntry {
  return {
    id: file.id,
    name: file.name,
    createdAt: file.modifiedTime
  }
}

/**
 * Merges the sheets Drive reports with the ones this device already knows. Under
 * drive.file, Drive lists only sheets the app created or the user picked with it.
 */
export async function syncSpreadsheetsFromDrive(): Promise<SpreadsheetEntry[]> {
  const settings = getSettings() ?? getDefaultSettings()

  const fromDrive = await listAccountingSpreadsheetsFromDrive()

  const merged = new Map<string, SpreadsheetEntry>()

  for (const sheet of settings.spreadsheets ?? []) {
    merged.set(sheet.id, sheet)
  }
  for (const file of fromDrive) {
    merged.set(file.id, driveFileToEntry(file))
  }

  const spreadsheets = Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  saveSettings({
    ...settings,
    spreadsheets,
    spreadsheetId: settings.spreadsheetId
  })

  return spreadsheets
}
