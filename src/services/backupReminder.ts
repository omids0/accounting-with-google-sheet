import { getItem, setItem } from './storage'

/** Per spreadsheet: `{ [spreadsheetId]: BackupState }`; wiped with the account. */
export const BACKUP_STORAGE_KEY = 'accounting_backup_v1'

export const BACKUP_REMINDER_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export interface BackupState {
  /** Last full backup downloaded on this device. */
  lastBackupAt?: number
  /** First dashboard visit with this feature: the clock for users who never backed up. */
  firstSeenAt?: number
  /** «✕» on the dashboard card: quiet until then. */
  snoozedUntil?: number
  /** «یادآوری ماهانه» turned off in settings. */
  reminderOff?: boolean
  /** Round 7 (Task I): «پشتیبان خودکار هفتگی» turned off (on by default). */
  autoOff?: boolean
  /** «اگر دو هفته پشتیبان نشد، خبر بده» turned off (on by default). */
  overdueNoticeOff?: boolean
  /** Last automatic backup saved to Drive (from this device or adopted from another). */
  lastAutoBackupAt?: number
  /** «Drive › … › پشتیبان»: where the last Drive backup went. */
  driveFolderLabel?: string
  /** Last «دو هفته پشتیبان نشد» notice: once per fortnight. */
  overdueNoticeAt?: number
  /** Lease against two tabs running the automatic backup at once. */
  autoLock?: { token: string; until: number }
}

type BackupStore = Record<string, BackupState>

const listeners = new Set<() => void>()

export function subscribeBackupState(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getBackupState(spreadsheetId: string): BackupState {
  return (getItem<BackupStore>(BACKUP_STORAGE_KEY) ?? {})[spreadsheetId] ?? {}
}

export function patchBackupState(spreadsheetId: string, patch: BackupState): void {
  const store = getItem<BackupStore>(BACKUP_STORAGE_KEY) ?? {}

  setItem(BACKUP_STORAGE_KEY, { ...store, [spreadsheetId]: { ...store[spreadsheetId], ...patch } })
  listeners.forEach(listener => listener())
}

export function markBackupDone(spreadsheetId: string, now = Date.now()): void {
  patchBackupState(spreadsheetId, { lastBackupAt: now, snoozedUntil: undefined })
}

export function snoozeBackupReminder(spreadsheetId: string, now = Date.now()): void {
  patchBackupState(spreadsheetId, { snoozedUntil: now + BACKUP_REMINDER_DAYS * DAY_MS })
}

export function setBackupReminderOn(spreadsheetId: string, on: boolean): void {
  patchBackupState(spreadsheetId, { reminderOff: !on })
}

export function setAutoBackupOn(spreadsheetId: string, on: boolean): void {
  patchBackupState(spreadsheetId, { autoOff: !on })
}

export function setOverdueNoticeOn(spreadsheetId: string, on: boolean): void {
  patchBackupState(spreadsheetId, { overdueNoticeOff: !on })
}

/** Starts the clock for a spreadsheet that has never been backed up on this device. */
export function noteBackupFirstSeen(spreadsheetId: string, now = Date.now()): void {
  if (getBackupState(spreadsheetId).firstSeenAt === undefined) {
    patchBackupState(spreadsheetId, { firstSeenAt: now })
  }
}

export type BackupReminder = { kind: 'since'; days: number } | { kind: 'never' }

/**
 * The dashboard card is due once 30 days passed since the last backup — or,
 * when there never was one, since this device first saw the spreadsheet (so
 * never in the first 30 days). Not for a spreadsheet without records, while
 * snoozed, or with the reminder turned off.
 */
export function backupReminderDue(
  state: BackupState,
  hasData: boolean,
  now = Date.now()
): BackupReminder | null {
  if (state.reminderOff || !hasData) return null
  if (state.snoozedUntil !== undefined && now < state.snoozedUntil) return null

  const since = state.lastBackupAt ?? state.firstSeenAt

  if (since === undefined) return null

  const days = Math.floor((now - since) / DAY_MS)

  if (days < BACKUP_REMINDER_DAYS) return null

  return state.lastBackupAt === undefined ? { kind: 'never' } : { kind: 'since', days }
}
