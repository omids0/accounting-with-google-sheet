import { useEffect, useRef } from 'react'

import { getLastOperationDate, syncAppOpen } from '../services/activityTracking'
import { isTokenValid } from '../services/auth'
import { setLastOperationDateNative } from '../services/bankSmsNative'
import { isNativePlatform } from '../services/googleAuthNative'
import { refreshScheduledReminders } from '../services/localNotifications'
import { getCurrentPushSubscription, getDeviceLabel } from '../services/pushNotifications'
import { migrateReminderDefaults } from '../services/reminderDefaultsMigration'
import { upsertPushSubscription } from '../services/reminders'
import { getSettings } from '../services/settings'

const TOKEN_WAIT_MS = 60_000

const TOKEN_POLL_MS = 1_000

async function waitForValidToken(): Promise<boolean> {
  const deadline = Date.now() + TOKEN_WAIT_MS

  while (!isTokenValid()) {
    if (Date.now() > deadline) return false
    await new Promise(resolve => setTimeout(resolve, TOKEN_POLL_MS))
  }

  return true
}

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

export function useEngagementReminders(): void {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    void (async () => {
      try {
        // Cached data now shows before the token is renewed; wait for it.
        if (!(await waitForValidToken())) return
        await migrateReminderDefaults(spreadsheetId)
        await syncAppOpen(spreadsheetId)

        // The APK has no service worker, so its reminders are scheduled on the device.
        if (isNativePlatform()) {
          await setLastOperationDateNative(getLastOperationDate())
          await refreshScheduledReminders(spreadsheetId)
        } else {
          await refreshPushSubscription(spreadsheetId)
        }
      } catch {
        /* non-blocking background setup */
      }
    })()
  }, [])
}
