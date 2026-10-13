import { backupOverdueDays, overdueMessage, overdueNoticeDue } from './autoBackupPlan'
import { getBackupState, patchBackupState } from './backupReminder'
import { showInstantNotification } from './localNotifications'
import { showInfo } from '../utils/toast'

const NOTICE_TITLE = 'پشتیبان گرفته نشده'

/**
 * «اگر دو هفته پشتیبان نشد، خبر بده»: a local notification on the APK (a toast on
 * the web, which has none), at most once per fortnight.
 */
export async function notifyBackupOverdue(spreadsheetId: string, now = Date.now()): Promise<void> {
  const days = overdueNoticeDue(getBackupState(spreadsheetId), now)

  if (days === null) return

  const body = overdueMessage(days)
  const shown = await showInstantNotification('backup_overdue', NOTICE_TITLE, body).catch(
    () => false
  )

  if (!shown) showInfo(body)
  patchBackupState(spreadsheetId, { overdueNoticeAt: now })
}

/** Tonight's digest line while no backup succeeded for 14+ days. */
export function backupDigestLines(spreadsheetId: string, now = Date.now()): string[] {
  const days = backupOverdueDays(getBackupState(spreadsheetId), now)

  return days === null ? [] : [overdueMessage(days)]
}
