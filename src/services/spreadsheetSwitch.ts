import { isNativePlatform } from './googleAuthNative'
import { refreshScheduledReminders } from './localNotifications'
import { getCurrentPushSubscription, getDeviceLabel } from './pushNotifications'
import { upsertPushSubscription } from './reminders'
import { initializeSheetSync, resetSheetSync } from './sheetSync'
import { isSharedWorkspace } from './workspace'

/**
 * Reminders are read from the active sheet: schedule (APK) or register push (web) for it. A shared
 * account has none, and its partner must never read this device's push keys.
 */
async function refreshRemindersForSheet(spreadsheetId: string): Promise<void> {
  if (isSharedWorkspace(spreadsheetId)) return
  if (isNativePlatform()) {
    await refreshScheduledReminders(spreadsheetId, { force: true })

    return
  }

  const existing = await getCurrentPushSubscription()

  if (!existing?.endpoint || !existing.keys?.p256dh || !existing.keys.auth) return
  await upsertPushSubscription(spreadsheetId, {
    endpoint: existing.endpoint,
    p256dh: existing.keys.p256dh,
    auth: existing.keys.auth,
    deviceLabel: getDeviceLabel(),
    updatedAt: new Date().toISOString()
  })
}

/**
 * Moves the sync engine (poll timer, mirror, outbox flushes) and reminders to
 * the newly active sheet; before this they kept working on the previous one.
 */
export async function moveSyncToSpreadsheet(
  previousId: string | undefined,
  nextId: string
): Promise<void> {
  if (previousId && previousId !== nextId) resetSheetSync(previousId, { keepOutbox: true })
  // A failed first download is already shown on the sync badge; the switch itself stands.
  await initializeSheetSync(nextId).catch(() => undefined)
  void refreshRemindersForSheet(nextId).catch(() => undefined)
}
