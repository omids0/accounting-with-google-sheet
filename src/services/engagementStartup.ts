import { getLastOperationDate, syncAppOpen } from './activityTracking'
import { setLastOperationDateNative } from './bankSmsNative'
import { syncBudgetDigest } from './budgetDigest'
import { subscribeDataRevision } from './dataRevision'
import { isNativePlatform } from './googleAuthNative'
import { refreshScheduledReminders } from './localNotifications'
import { getCurrentPushSubscription, getDeviceLabel } from './pushNotifications'
import { migrateReminderDefaults } from './reminderDefaultsMigration'
import { upsertPushSubscription } from './reminders'
import { isSharedWorkspace } from './workspace'

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

/** Budget lines follow edits through the day; a burst of writes syncs once. */
const BUDGET_DIGEST_DELAY_MS = 5_000

let budgetDigestWatch: (() => void) | null = null

function watchBudgetDigest(spreadsheetId: string): void {
  let timer: ReturnType<typeof setTimeout> | undefined

  budgetDigestWatch?.()
  budgetDigestWatch = subscribeDataRevision(() => {
    clearTimeout(timer)
    timer = setTimeout(
      () => void syncBudgetDigest(spreadsheetId).catch(() => undefined),
      BUDGET_DIGEST_DELAY_MS
    )
  })
}

/**
 * Background setup after sign-in: reminder defaults, activity ping, reminder delivery. All of it is
 * personal (push keys, device reminders, digest): a shared account's sheet never gets it, and the
 * device keeps the reminders it scheduled from the personal sheet.
 */
export async function runEngagementStartup(spreadsheetId: string): Promise<void> {
  if (isSharedWorkspace(spreadsheetId)) return
  await migrateReminderDefaults(spreadsheetId)
  await syncAppOpen(spreadsheetId)

  // The APK has no service worker, so its reminders are scheduled on the device.
  if (isNativePlatform()) {
    await setLastOperationDateNative(getLastOperationDate())
    await refreshScheduledReminders(spreadsheetId)
    await syncBudgetDigest(spreadsheetId).catch(() => undefined)
    watchBudgetDigest(spreadsheetId)
  } else {
    await refreshPushSubscription(spreadsheetId)
  }
}
