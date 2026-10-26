import {
  AUTO_LOCK_MS,
  autoBackupDue,
  autoLockHeld,
  backupsToPrune,
  recentAutoBackup,
  type DriveBackupFile,
  type DriveBackupKind
} from './autoBackupPlan'
import { buildFullBackup, saveFullBackup, type FullBackup } from './backupExport'
import { getBackupState, noteBackupFirstSeen, patchBackupState } from './backupReminder'
import { getBackupFolder, listDriveBackups, uploadDriveBackup } from './driveBackups'
import { deleteDriveFiles } from './driveFiles'
import { waitForSessionSync } from './sessionSync'
import { getSettings } from './settings'
import { sharedCan } from './sharedCan'
import { activeSpreadsheetLabel } from './spreadsheetCatalog'
import { showSuccess } from '../utils/toast'

/** A finished Drive backup: the clocks of both reminders move, the folder line updates. */
function markDriveBackup(spreadsheetId: string, at: number, kind: DriveBackupKind, label: string) {
  const state = getBackupState(spreadsheetId)

  patchBackupState(spreadsheetId, {
    lastBackupAt: Math.max(state.lastBackupAt ?? 0, at),
    ...(kind === 'auto' ? { lastAutoBackupAt: Math.max(state.lastAutoBackupAt ?? 0, at) } : {}),
    driveFolderLabel: label,
    snoozedUntil: undefined
  })
}

function buildActiveBackup(spreadsheetId: string): Promise<FullBackup> {
  return buildFullBackup(spreadsheetId, activeSpreadsheetLabel(getSettings()))
}

/** Uploads one zip and drops the automatic ones past the newest three (best effort). */
async function uploadAndPrune(
  spreadsheetId: string,
  backup: FullBackup,
  kind: DriveBackupKind,
  known?: DriveBackupFile[]
): Promise<DriveBackupFile> {
  const folder = await getBackupFolder(spreadsheetId)
  const existing = known ?? (await listDriveBackups(spreadsheetId, folder.id))
  const file = await uploadDriveBackup(spreadsheetId, folder.id, backup, kind)

  markDriveBackup(spreadsheetId, file.createdAt, kind, folder.label)
  await deleteDriveFiles(backupsToPrune([file, ...existing]).map(item => item.id))

  return file
}

export interface BackupNowResult {
  /** Saved name on this device; null when the share sheet was closed. */
  saved: string | null
  /** Why the «دستی» Drive copy failed, when it did. */
  driveError?: unknown
}

/**
 * «پشتیبان الان»: the round-5 zip saved on this device plus a «دستی» copy in
 * Drive (never pruned). A failed upload still leaves the local file.
 */
export async function backupNow(spreadsheetId: string): Promise<BackupNowResult> {
  const backup = await buildActiveBackup(spreadsheetId)
  let driveError: unknown

  try {
    await uploadAndPrune(spreadsheetId, backup, 'manual')
  } catch (err) {
    driveError = err
  }

  const saved = await saveFullBackup(spreadsheetId, backup)

  return driveError === undefined ? { saved } : { saved, driveError }
}

/** Time for a racing tab's lease write to land before ours is read back. */
const LOCK_SETTLE_MS = 250

/**
 * The lease lives in `accounting_backup_v1`, which every tab of this browser
 * shares: write a token, let a racing tab's write land, read it back.
 */
async function acquireLease(spreadsheetId: string): Promise<string | null> {
  if (autoLockHeld(getBackupState(spreadsheetId))) return null

  const token = crypto.randomUUID()

  patchBackupState(spreadsheetId, { autoLock: { token, until: Date.now() + AUTO_LOCK_MS } })
  await new Promise(resolve => setTimeout(resolve, LOCK_SETTLE_MS + Math.random() * 100))

  return getBackupState(spreadsheetId).autoLock?.token === token ? token : null
}

function releaseLease(spreadsheetId: string, token: string): void {
  if (getBackupState(spreadsheetId).autoLock?.token === token) {
    patchBackupState(spreadsheetId, { autoLock: undefined })
  }
}

/** Web Locks where the browser has them (one holder across tabs), plus the lease. */
async function withAutoBackupLock(
  spreadsheetId: string,
  task: () => Promise<boolean>
): Promise<boolean> {
  const leased = async () => {
    const token = await acquireLease(spreadsheetId)

    if (!token) return false
    try {
      return await task()
    } finally {
      releaseLease(spreadsheetId, token)
    }
  }

  if (typeof navigator === 'undefined' || !navigator.locks) return leased()

  return navigator.locks.request(`acct-auto-backup:${spreadsheetId}`, { ifAvailable: true }, lock =>
    lock ? leased() : false
  )
}

async function autoBackup(spreadsheetId: string): Promise<boolean> {
  // A shared account's viewer has no «خروجی و پشتیبان».
  if (!sharedCan('export', spreadsheetId)) return false
  noteBackupFirstSeen(spreadsheetId)
  if (!autoBackupDue(getBackupState(spreadsheetId))) return false
  if (!(await waitForSessionSync())) return false
  if (getSettings()?.spreadsheetId !== spreadsheetId) return false

  return withAutoBackupLock(spreadsheetId, () => uploadWeekly(spreadsheetId))
}

/** Under the lock: re-check, adopt another device's fresh backup, or upload this week's. */
async function uploadWeekly(spreadsheetId: string): Promise<boolean> {
  // Another tab may have finished while this one waited for its sync (our own lease is not a block).
  if (!autoBackupDue({ ...getBackupState(spreadsheetId), autoLock: undefined })) return false

  const folder = await getBackupFolder(spreadsheetId)
  const files = await listDriveBackups(spreadsheetId, folder.id)
  const recent = recentAutoBackup(files)

  // Another device already made this week's backup.
  if (recent) {
    markDriveBackup(spreadsheetId, recent.createdAt, 'auto', folder.label)

    return false
  }

  await uploadAndPrune(spreadsheetId, await buildActiveBackup(spreadsheetId), 'auto', files)
  showSuccess('پشتیبان خودکار ذخیره شد')

  return true
}

let inFlight: Promise<void> | null = null

/**
 * App open: the weekly zip to Drive once 7 days passed since the last backup,
 * after this launch's first sync, in the background; then the 14-day notice.
 * Failures stay quiet — the next open tries again, and the notice catches a
 * streak of them.
 */
export function runAutoBackup(spreadsheetId: string): Promise<void> {
  if (inFlight) return inFlight

  inFlight = autoBackup(spreadsheetId)
    .catch(() => false)
    .then(() => import('./backupOverdueNotice'))
    .then(module => module.notifyBackupOverdue(spreadsheetId))
    .catch(() => undefined)
    .finally(() => {
      inFlight = null
    })

  return inFlight
}
