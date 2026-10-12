import { getLastOperationDate, syncAppOpen } from './activityTracking'
import { setLastOperationDateNative } from './bankSmsNative'
import { isNativePlatform } from './googleAuthNative'
import { refreshScheduledReminders } from './localNotifications'
import { getCurrentPushSubscription, getDeviceLabel } from './pushNotifications'
import { migrateReminderDefaults } from './reminderDefaultsMigration'
import { upsertPushSubscription } from './reminders'

/** Keeps an existing subscription fresh; permission is only asked from the reminders page. */
async function refreshPushSubscription(spreadsheetId: string): Promise<void> {
  const existing = await getCurrentPushSubscription()

  if (!existing?.endpoint) return

  await upsertPushSubscription(spreadsheetId, {
    endpoint: existing.endpoint,
    p256dh: existing.keys!.p256dh!,
    auth: existing.keys!.auth!,
    deviceLabel: getDeviceLabel(),
    updatedAt: new Date().toISOString()
  })
}

/** Background setup after sign-in: reminder defaults, activity ping, reminder delivery. */
export async function runEngagementStartup(spreadsheetId: string): Promise<void> {
  await migrateReminderDefaults(spreadsheetId)
  await syncAppOpen(spreadsheetId)

  // The APK has no service worker, so its reminders are scheduled on the device.
  if (isNativePlatform()) {
    await setLastOperationDateNative(getLastOperationDate())
    await refreshScheduledReminders(spreadsheetId)
  } else {
    await refreshPushSubscription(spreadsheetId)
  }
}
