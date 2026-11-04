import type { SpreadsheetEntry } from '../types'
import {
  isForeignReadOnlyFile,
  listAccountingSpreadsheetsFromDrive,
  type DriveSpreadsheetFile
} from './drive'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { isMemberSpreadsheetTitle } from './spreadsheetCatalog'

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
 * A personal-looking sheet someone else owns and this user can only read (a child's account shared
 * with a parent) is never added here: without the device-local child registry it would pass for
 * the user's own books. It stays listed only when this device registered it. A building or shared
 * account titled sheet is added even as a reader (board, viewer).
 */
export async function syncSpreadsheetsFromDrive(): Promise<SpreadsheetEntry[]> {
  const settings = getSettings() ?? getDefaultSettings()

  const fromDrive = await listAccountingSpreadsheetsFromDrive()

  const merged = new Map<string, SpreadsheetEntry>()

  for (const sheet of settings.spreadsheets ?? []) {
    merged.set(sheet.id, sheet)
  }
  for (const file of fromDrive) {
    // Drive knows nothing about the workspace kind or an archived building: keep what this
    // device registered.
    const known = merged.get(file.id)

    // A building or shared-account title is kept: its readers (board, viewer) are legitimate, and
    // opening it checks the sheet's own marker row (assertCanOpenAsOwnSheet).
    if (!known && isForeignReadOnlyFile(file) && !isMemberSpreadsheetTitle(file.name)) continue

    merged.set(file.id, {
      ...driveFileToEntry(file),
      // A child's name is the one the parent gave it, not the child's own sheet title.
      ...(known?.kind === 'child' ? { name: known.name } : {}),
      ...(known?.kind ? { kind: known.kind } : {}),
      ...(known?.active === false ? { active: false } : {})
    })
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
