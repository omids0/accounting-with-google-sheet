import { syncCategoriesFromSheet } from './categories'
import { migrateActivityTrailColumns } from './migrateActivityTrailColumns'
import { migrateCheckDirectionColumn } from './migrateCheckDirectionColumn'
import { migrateLegacyMachineExpenseCategory } from './migrateLegacyMachineExpenseCategory'
import { migrateSubCategoryColumn } from './migrateSubCategoryColumn'
import { migrateWalletColumns } from './migrateWalletApplyColumn'
import { BUILDING_SHEET_SPECS, SHARED_SHEET_SPECS } from './moduleSheetSpecs'
import { ensureMembershipDate } from './periodSettings'
import { ensureManySheetsWithHeaders } from './sheetsEnsure'
import { getWorkspaceType, hasWorkspaceType, syncWorkspaceTypeFromSheet } from './workspace'

export { syncCategoriesFromSheet }

/**
 * Workspace type first (round 11): the category lists and the record form fields of a
 * building differ from a personal spreadsheet's, and both are applied by the category sync.
 */
export async function refreshSpreadsheetContents(spreadsheetId: string): Promise<void> {
  const type = await syncWorkspaceTypeFromSheet(spreadsheetId)

  // A building opened before its type was known on this device (shared with the board, say)
  // missed its tabs when the spreadsheet was set up; a personal spreadsheet never gets them.
  if (type === 'building') {
    await ensureManySheetsWithHeaders(spreadsheetId, BUILDING_SHEET_SPECS).catch(() => undefined)
  }
  // A shared account first met on this device gets its own few tabs, never the personal ones.
  if (type === 'shared') {
    await ensureManySheetsWithHeaders(spreadsheetId, SHARED_SHEET_SPECS).catch(() => undefined)
  }
  await syncCategoriesFromSheet(spreadsheetId)
}

/** First-time work on a spreadsheet after its tabs exist: categories, one-off migrations. */
export async function prepareSpreadsheetContents(spreadsheetId: string): Promise<void> {
  await refreshSpreadsheetContents(spreadsheetId)
  // The activity tab exists in every workspace kind, so its new columns are added in all of them.
  await migrateActivityTrailColumns(spreadsheetId).catch(() => undefined)
  // A building file is born in round 11 with current headers and no vehicles: the personal
  // spreadsheet's one-off migrations have nothing to fix there and would read ten tabs for it. A
  // shared account is born the same way.
  if (getWorkspaceType(spreadsheetId) !== 'personal') {
    await ensureMembershipDate(spreadsheetId).catch(() => '')

    return
  }
  await migrateLegacyMachineExpenseCategory(spreadsheetId).catch(() => undefined)
  await migrateSubCategoryColumn(spreadsheetId).catch(() => undefined)
  await migrateCheckDirectionColumn(spreadsheetId).catch(() => undefined)
  await migrateWalletColumns(spreadsheetId).catch(() => undefined)
  await ensureMembershipDate(spreadsheetId).catch(() => '')
}

/** Same migrations, fire-and-forget, for a spreadsheet that was already prepared. */
export function runBackgroundMigrations(spreadsheetId: string): void {
  // A sheet first seen on this device (shared with the board, say): learn its workspace type.
  if (!hasWorkspaceType(spreadsheetId)) void syncWorkspaceTypeFromSheet(spreadsheetId)
  void migrateActivityTrailColumns(spreadsheetId).catch(() => undefined)
  if (getWorkspaceType(spreadsheetId) !== 'personal') return
  void migrateLegacyMachineExpenseCategory(spreadsheetId).catch(() => undefined)
  void migrateSubCategoryColumn(spreadsheetId)
    .catch(() => undefined)
    .then(() => migrateCheckDirectionColumn(spreadsheetId))
    .catch(() => undefined)
    .then(() => migrateWalletColumns(spreadsheetId))
    .catch(() => undefined)
}
