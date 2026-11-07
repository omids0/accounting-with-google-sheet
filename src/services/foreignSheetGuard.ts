import type { SpreadsheetEntry } from '../types'
import { getDriveFileAccess, isForeignReadOnlyFile, type DriveFileAccess } from './drive'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getWorkspaceType, workspaceTypeOfRows, type WorkspaceType } from './workspace'

export const FOREIGN_READ_ONLY_SHEET_MESSAGE =
  'این شیت را شخص دیگری ساخته و شما فقط اجازهٔ دیدن آن را دارید، پس دفتر شخصی شما نمی‌شود. اگر حساب فرزند شماست، از منوی «فرزندان من» آن را وصل کنید.'

/**
 * Whether a sheet may be opened (and so registered, prepared and written to) as one of the user's
 * own spreadsheets. A file someone else owns that this user cannot edit is refused, with two
 * exceptions that are legitimate read-only viewers: a shared account or a building (their sheet's
 * own «نوع فضا» row says so) and a child's account a parent already registered here. Everything
 * else (owned files, files shared for editing, files Drive did not describe) is unchanged.
 */
export function canOpenAsOwnSheet(file: DriveFileAccess, type: WorkspaceType): boolean {
  return !isForeignReadOnlyFile(file) || type !== 'personal'
}

/** Sheets that passed the Drive check in this page's life: switching back to one costs no request. */
const passed = new Set<string>()

/** Forget what passed: tests, and sign-out (`clearAllLocalData`). */
export function resetForeignSheetGuard(): void {
  passed.clear()
}

/**
 * Called by `activateSpreadsheet` before anything is written (tabs, headers, migrations, activity,
 * push keys): asks Drive who owns the file and whether the user may edit it, and throws
 * `FOREIGN_READ_ONLY_SHEET_MESSAGE` for a foreign read-only file that is not a shared account or a
 * building. A sheet this device already knows as a building, shared account or child is skipped
 * (it was classified when it was registered). When Drive cannot be asked, a sheet already on this
 * device's list opens as before (offline start), a new one is refused with Drive's own error.
 */
export async function assertCanOpenAsOwnSheet(
  spreadsheetId: string,
  listed?: SpreadsheetEntry
): Promise<void> {
  if (getWorkspaceType(spreadsheetId) !== 'personal' || passed.has(spreadsheetId)) return

  let access: Awaited<ReturnType<typeof getDriveFileAccess>>

  try {
    access = await getDriveFileAccess(spreadsheetId)
  } catch (err) {
    if (listed) return
    throw err
  }

  if (!isForeignReadOnlyFile(access)) {
    passed.add(spreadsheetId)

    return
  }

  // A viewer of a shared account or a building has Drive reader access too: the sheet's own marker
  // row tells them apart from a child's personal account. Unreadable = refused (fail closed).
  const fetched = await batchFetchSheetRangesFromApi(spreadsheetId, [PERIOD_SETTINGS_SHEET])

  const type = workspaceTypeOfRows((fetched.get(PERIOD_SETTINGS_SHEET) ?? []).slice(1))

  if (!canOpenAsOwnSheet(access, type)) throw new Error(FOREIGN_READ_ONLY_SHEET_MESSAGE)
}
