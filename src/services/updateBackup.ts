import { UPDATE_BACKUP_FAILED_MESSAGE } from './appUpdate'
import { isTokenValid } from './auth'
import { buildActiveBackup, uploadAndPrune } from './driveBackupRun'
import { getSettings } from './settings'
import { sharedCan } from './sharedCan'
import { activeSpreadsheetLabel } from './spreadsheetCatalog'
import { updateBackupKindFor, updateBackupName } from './updateBackupPlan'
import { APP_VERSION_LABEL, IS_DEV_ENV } from '../utils/appEnv'
import { showInfo } from '../utils/toast'

/** The whole backup, folder lookup and upload included, never holds the update longer than this. */
export const UPDATE_BACKUP_TIMEOUT_MS = 20_000

/** `skipped`: nothing to back up here (offline, signed out, no export permission). */
export type UpdateBackupResult = 'saved' | 'skipped' | 'failed'

/** Offline, signed out or a shared account's viewer without «خروجی و پشتیبان»: no backup is tried. */
function backupAllowed(spreadsheetId: string | undefined): spreadsheetId is string {
  if (!spreadsheetId) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false

  return isTokenValid() && sharedCan('export', spreadsheetId)
}

async function saveBackup(spreadsheetId: string, toVersion?: string): Promise<void> {
  const kind = updateBackupKindFor(IS_DEV_ENV)
  const backup = await buildActiveBackup(spreadsheetId)

  const name = updateBackupName({
    spreadsheetLabel: activeSpreadsheetLabel(getSettings()),
    kind,
    fromVersion: APP_VERSION_LABEL,
    toVersion,
    at: backup.exportedAt
  })

  await uploadAndPrune(spreadsheetId, { ...backup, name }, kind, undefined, APP_VERSION_LABEL)
}

async function run(toVersion?: string): Promise<UpdateBackupResult> {
  const spreadsheetId = getSettings()?.spreadsheetId

  if (!backupAllowed(spreadsheetId)) return 'skipped'

  let timer: ReturnType<typeof setTimeout> | undefined
  const task = saveBackup(spreadsheetId, toVersion)

  // A late failure after the timeout has nobody to tell; the toast was already shown.
  task.catch(() => undefined)

  try {
    await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), UPDATE_BACKUP_TIMEOUT_MS)
      })
    ])

    return 'saved'
  } catch {
    showInfo(UPDATE_BACKUP_FAILED_MESSAGE)

    return 'failed'
  } finally {
    clearTimeout(timer)
  }
}

let inFlight: Promise<UpdateBackupResult> | null = null

/**
 * Before the new version is installed: one full backup of the active spreadsheet in Drive (kind
 * `update-dev` or `update-prod`), in the background. It never throws and never waits past
 * `UPDATE_BACKUP_TIMEOUT_MS`; a failure shows one quiet toast and the update goes on. A second
 * call while one runs gets the same run.
 */
export function backupBeforeUpdate(toVersion?: string): Promise<UpdateBackupResult> {
  if (inFlight) return inFlight

  inFlight = run(toVersion).finally(() => {
    inFlight = null
  })

  return inFlight
}
