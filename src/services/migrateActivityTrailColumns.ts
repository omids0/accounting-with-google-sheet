import { ACTIVITY_TRAIL_HEADERS } from './activityTrailModel'
import { appendHeaderColumns } from './migrateSubCategoryColumn'
import { ACTIVITY_LOG_SHEET } from './sheetNames'
import { getItem, setItem } from './storage'

const MIGRATION_STORAGE_KEY = 'accounting_activity_trail_column_migration_v1'

type MigrationState = Record<string, true>

/** Runs in flight per spreadsheet: a second call (a quick switch back) joins the first. */
const running = new Map<string, Promise<void>>()

function isMigrated(spreadsheetId: string): boolean {
  return Boolean((getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {})[spreadsheetId])
}

/** A spreadsheet this app created has the trail columns from the start: nothing to migrate. */
export function markActivityTrailMigrated(spreadsheetId: string): void {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })
}

/**
 * Adds «قبل»، «بعد» and «نسخه» to the end of «فعالیت_ها» of a spreadsheet whose tab was made
 * before them. Runs for every workspace kind (a building and a shared account keep this tab too).
 * An older app keeps reading the first nine columns; rows already there stay as they are, empty
 * in the new ones (no revert data). A tab that does not exist yet is created with all twelve.
 *
 * One header read and at most one write for all three columns; none once the spreadsheet is
 * remembered as done, and a call made while the first is still running waits for it.
 */
export async function migrateActivityTrailColumns(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId || isMigrated(spreadsheetId)) return

  const inFlight = running.get(spreadsheetId)

  if (inFlight) return inFlight

  const run = appendHeaderColumns(spreadsheetId, ACTIVITY_LOG_SHEET, ACTIVITY_TRAIL_HEADERS)
    .then(() => markActivityTrailMigrated(spreadsheetId))
    .finally(() => running.delete(spreadsheetId))

  running.set(spreadsheetId, run)

  return run
}
