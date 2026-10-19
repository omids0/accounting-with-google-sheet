import { isNativePlatform } from './googleAuthNative'
import { formatLogTime, formatSyncLog, getSyncLog } from './syncLog'
import { getFailedOutboxEntries, getOutboxEntries, type OutboxEntry } from './syncOutbox'
import { getSyncStatus } from './syncStatus'
import { version as APP_VERSION } from '../../package.json'

const ERROR_LIMIT = 200

function minutesAgo(at: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - at) / 60_000))

  return minutes < 1 ? 'کمتر از ۱ دقیقه' : `${minutes} دقیقه`
}

function describeEntry(entry: OutboxEntry, now: number): string {
  const { operation } = entry
  const parts = [
    `${operation.type} روی «${operation.sheetName}»`,
    `سن ${minutesAgo(entry.createdAt, now)}`,
    `تلاش ${entry.attempts}`
  ]

  if (entry.conflict) parts.push('منتظر تعارض')
  if (entry.reverted) parts.push('برگردانده شد')
  if (entry.lastError) parts.push(`خطا: ${entry.lastError.slice(0, ERROR_LIMIT)}`)

  return `- ${parts.join(' | ')}`
}

/**
 * The text behind «کپی گزارش همگام‌سازی»: app and connection facts, the queue as it is now,
 * and the diary of recent sync events. Safe to send: no cell values are included.
 */
export function buildSyncReport(spreadsheetId: string | null, now = Date.now()): string {
  const status = getSyncStatus()
  const pending = spreadsheetId ? getOutboxEntries(spreadsheetId) : []
  const failed = spreadsheetId ? getFailedOutboxEntries(spreadsheetId) : []
  const lines = [
    `گزارش همگام‌سازی — ${formatLogTime(now)}`,
    `نسخه اپ: ${APP_VERSION} (${isNativePlatform() ? 'اندروید' : 'وب'})`,
    `اتصال: ${status.connection}`,
    `وضعیت: ${status.syncState}`,
    `آخرین همگام‌سازی موفق: ${
      status.lastSyncedAt
        ? `${formatLogTime(status.lastSyncedAt)} (${minutesAgo(status.lastSyncedAt, now)} پیش)`
        : 'هنوز نشده'
    }`,
    `آخرین خطا: ${status.lastError ?? '—'}`,
    `در صف: ${pending.length} · ناموفق: ${failed.length} · تعارض: ${status.conflicts}`
  ]

  if (pending.length)
    lines.push('', 'صف ارسال:', ...pending.map(entry => describeEntry(entry, now)))
  if (failed.length)
    lines.push('', 'ثبت‌نشده‌ها:', ...failed.map(entry => describeEntry(entry, now)))

  const log = getSyncLog()

  lines.push(
    '',
    `رویدادها (${log.length}):`,
    log.length ? formatSyncLog(log) : 'هنوز رویدادی ثبت نشده.'
  )

  return lines.join('\n')
}
