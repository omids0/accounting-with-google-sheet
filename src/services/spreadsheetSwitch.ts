import { isNativePlatform } from './googleAuthNative'
import { refreshScheduledReminders } from './localNotifications'
import { getCurrentPushSubscription, getDeviceLabel } from './pushNotifications'
import { upsertPushSubscription } from './reminders'
import { initializeSheetSync, resetSheetSync } from './sheetSync'
import { isPersonalWorkspace } from './workspace'

/**
 * Reminders are read from the active sheet: schedule (APK) or register push (web) for it. Only a
 * personal sheet has them: a building's board and a shared account's partner read every tab, so
 * they must never get this device's push keys (the device keeps the personal reminders).
 */
async function refreshRemindersForSheet(spreadsheetId: string): Promise<void> {
  if (!isPersonalWorkspace(spreadsheetId)) return
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
