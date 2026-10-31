import { ACTIVITY_TRAIL_HEADERS } from './activityTrailModel'
import { appendHeaderColumn } from './migrateSubCategoryColumn'
import { ACTIVITY_LOG_SHEET } from './sheetNames'
import { getItem, setItem } from './storage'

const MIGRATION_STORAGE_KEY = 'accounting_activity_trail_column_migration_v1'

type MigrationState = Record<string, true>

/**
 * Adds «قبل»، «بعد» and «نسخه» to the end of «فعالیت_ها» of a spreadsheet whose tab was made
 * before them. Runs for every workspace kind (a building and a shared account keep this tab too).
 * An older app keeps reading the first nine columns; rows already there stay as they are, empty
 * in the new ones (no revert data). A tab that does not exist yet is created with all twelve.
 */
export async function migrateActivityTrailColumns(spreadsheetId: string): Promise<void> {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  if (!spreadsheetId || state[spreadsheetId]) return

  for (const label of ACTIVITY_TRAIL_HEADERS) {
    await appendHeaderColumn(spreadsheetId, ACTIVITY_LOG_SHEET, label)
  }
  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })
}
