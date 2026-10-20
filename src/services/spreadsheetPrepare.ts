import { syncCategoriesFromSheet } from './categories'
import { migrateLegacyMachineExpenseCategory } from './migrateLegacyMachineExpenseCategory'
import { migrateSubCategoryColumn } from './migrateSubCategoryColumn'
import { migrateWalletColumns } from './migrateWalletApplyColumn'
import { ensureMembershipDate } from './periodSettings'
import { hasWorkspaceType, syncWorkspaceTypeFromSheet } from './workspace'

export { syncCategoriesFromSheet }

/**
 * Workspace type first (round 11): the category lists and the record form fields of a
 * building differ from a personal spreadsheet's, and both are applied by the category sync.
 */
export async function refreshSpreadsheetContents(spreadsheetId: string): Promise<void> {
  await syncWorkspaceTypeFromSheet(spreadsheetId)
  await syncCategoriesFromSheet(spreadsheetId)
}

/** First-time work on a spreadsheet after its tabs exist: categories, one-off migrations. */
export async function prepareSpreadsheetContents(spreadsheetId: string): Promise<void> {
  await refreshSpreadsheetContents(spreadsheetId)
  await migrateLegacyMachineExpenseCategory(spreadsheetId).catch(() => undefined)
  await migrateSubCategoryColumn(spreadsheetId).catch(() => undefined)
  await migrateWalletColumns(spreadsheetId).catch(() => undefined)
  await ensureMembershipDate(spreadsheetId).catch(() => '')
}

/** Same migrations, fire-and-forget, for a spreadsheet that was already prepared. */
export function runBackgroundMigrations(spreadsheetId: string): void {
  // A sheet first seen on this device (shared with the board, say): learn its workspace type.
  if (!hasWorkspaceType(spreadsheetId)) void syncWorkspaceTypeFromSheet(spreadsheetId)
  void migrateLegacyMachineExpenseCategory(spreadsheetId).catch(() => undefined)
  void migrateSubCategoryColumn(spreadsheetId)
    .catch(() => undefined)
    .then(() => migrateWalletColumns(spreadsheetId))
    .catch(() => undefined)
}
