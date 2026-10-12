import { syncCategoriesFromSheet } from './categories'
import { migrateLegacyMachineExpenseCategory } from './migrateLegacyMachineExpenseCategory'
import { migrateSubCategoryColumn } from './migrateSubCategoryColumn'
import { migrateWalletColumns } from './migrateWalletApplyColumn'
import { ensureMembershipDate } from './periodSettings'

export { syncCategoriesFromSheet }

/** First-time work on a spreadsheet after its tabs exist: categories, one-off migrations. */
export async function prepareSpreadsheetContents(spreadsheetId: string): Promise<void> {
  await syncCategoriesFromSheet(spreadsheetId)
  await migrateLegacyMachineExpenseCategory(spreadsheetId).catch(() => undefined)
  await migrateSubCategoryColumn(spreadsheetId).catch(() => undefined)
  await migrateWalletColumns(spreadsheetId).catch(() => undefined)
  await ensureMembershipDate(spreadsheetId).catch(() => '')
}

/** Same migrations, fire-and-forget, for a spreadsheet that was already prepared. */
export function runBackgroundMigrations(spreadsheetId: string): void {
  void migrateLegacyMachineExpenseCategory(spreadsheetId).catch(() => undefined)
  void migrateSubCategoryColumn(spreadsheetId)
    .catch(() => undefined)
    .then(() => migrateWalletColumns(spreadsheetId))
    .catch(() => undefined)
}
