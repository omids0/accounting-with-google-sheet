import type { BackupState } from './backupReminder'

/** Round 7, Task I: a full zip in Drive every week, the three newest automatic ones kept. */
export const AUTO_BACKUP_INTERVAL_DAYS = 7

export const AUTO_BACKUP_KEEP = 3

/** Pre-update safety copies (`updateBackup.ts`): the newest five of each environment stay. */
export const UPDATE_BACKUP_KEEP = 5

/** «اگر دو هفته پشتیبان نشد، خبر بده»: after 14 days without a backup, once per fortnight. */
export const OVERDUE_NOTICE_DAYS = 14

/** A run that crashed (tab closed mid-upload) frees the lease after this long. */
export const AUTO_LOCK_MS = 10 * 60_000

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * One copy per press of «به‌روزرسانی». The develop and the production app share a Google account
 * and so one Drive folder: each writes (and prunes) only its own kind.
 */
export type UpdateBackupKind = 'update-dev' | 'update-prod'

export type DriveBackupKind = 'auto' | 'manual' | UpdateBackupKind

export interface DriveBackupFile {
  id: string
  name: string
  /** Bytes, when Drive reports it. */
  size?: number
  createdAt: number
  kind: DriveBackupKind
  /** The app version that made an update backup ("2.17.0", "2.17.0-dev"). */
  appVersion?: string
}

/** The newest backup of any kind: a downloaded zip, «پشتیبان الان» or an automatic one. */
export function lastSuccessfulBackup(state: BackupState): number | undefined {
  const times = [state.lastBackupAt, state.lastAutoBackupAt].filter(
    (at): at is number => typeof at === 'number'
  )

  return times.length ? Math.max(...times) : undefined
}

/** Days without a backup, counted from the first visit for a spreadsheet never backed up. */
function daysWithoutBackup(state: BackupState, now: number): number | null {
  const since = lastSuccessfulBackup(state) ?? state.firstSeenAt

  return since === undefined ? null : Math.floor((now - since) / DAY_MS)
}

export function autoLockHeld(state: BackupState, now = Date.now()): boolean {
  return state.autoLock !== undefined && state.autoLock.until > now
}

/**
 * The weekly gate: on, and at least 7 days since the last successful backup (or
 * since this device first saw a spreadsheet that never had one), and no other
 * tab already running it.
 */
export function autoBackupDue(state: BackupState, now = Date.now()): boolean {
  if (state.autoOff || autoLockHeld(state, now)) return false

  const days = daysWithoutBackup(state, now)

  return days !== null && days >= AUTO_BACKUP_INTERVAL_DAYS
}

/** Whole days since the last backup once it is 14 or more; null before (or with the notice off). */
export function backupOverdueDays(state: BackupState, now = Date.now()): number | null {
  if (state.overdueNoticeOff) return null

  const days = daysWithoutBackup(state, now)

  return days !== null && days >= OVERDUE_NOTICE_DAYS ? days : null
}

/** The notification: overdue, and not already sent in the last 14 days. */
export function overdueNoticeDue(state: BackupState, now = Date.now()): number | null {
  const days = backupOverdueDays(state, now)

  if (days === null) return null
  if (
    state.overdueNoticeAt !== undefined &&
    now - state.overdueNoticeAt < OVERDUE_NOTICE_DAYS * DAY_MS
  )
    return null

  return days
}

/** Automatic backups past the newest `keep`; manual ones are never pruned. */
export function backupsToPrune(
  files: readonly DriveBackupFile[],
  keep = AUTO_BACKUP_KEEP
): DriveBackupFile[] {
  return files
    .filter(file => file.kind === 'auto')
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(keep)
}

/** The pre-update copies of one environment past its newest `keep`; every other kind is left alone. */
export function updateBackupsToPrune(
  files: readonly DriveBackupFile[],
  kind: UpdateBackupKind,
  keep = UPDATE_BACKUP_KEEP
): DriveBackupFile[] {
  return files
    .filter(file => file.kind === kind)
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(keep)
}

/** An automatic backup made within the week (e.g. by another device) makes this run unnecessary. */
export function recentAutoBackup(
  files: readonly DriveBackupFile[],
  now = Date.now()
): DriveBackupFile | null {
  const newest = files
    .filter(file => file.kind === 'auto')
    .reduce<DriveBackupFile | null>(
      (best, file) => (!best || file.createdAt > best.createdAt ? file : best),
      null
    )

  return newest && now - newest.createdAt < AUTO_BACKUP_INTERVAL_DAYS * DAY_MS ? newest : null
}

function persianCount(value: number): string {
  return value.toLocaleString('fa-IR')
}

/** «پشتیبان: ۱۶ روز است پشتیبانی گرفته نشده.» — notification body and digest line. */
export function overdueMessage(days: number): string {
  return `پشتیبان: ${persianCount(days)} روز است پشتیبانی گرفته نشده.`
}

/** «۲٫۱ MB» */
export function formatBackupSize(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return ''
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} KB`
  }

  return `${(bytes / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} MB`
}
