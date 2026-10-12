import { useState } from 'react'

import { isNativePlatform } from '../../services/googleAuthNative'
import {
  getNotificationPermission,
  refreshScheduledReminders,
  requestNotificationPermission
} from '../../services/localNotifications'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

export type ReminderSaveKind =
  | 'installments'
  | 'checks'
  | 'dang'
  | 'personal'
  | 'vehicle-mileage'
  | 'vehicle-deadline'
  | 'vehicle-periodic-service'

/**
 * The APK schedules reminders on the device, so its gate is the OS notification
 * permission rather than a web push subscription.
 */
export function useNativeReminderPermission(spreadsheetId: string) {
  const native = isNativePlatform()

  const [blockedKind, setBlockedKind] = useState<ReminderSaveKind | null>(null)

  const [requesting, setRequesting] = useState(false)

  const [denied, setDenied] = useState(false)

  /** Returns true when saving an enabled rule may go ahead; otherwise shows the inline prompt. */
  const ensurePermission = async (kind: ReminderSaveKind): Promise<boolean> => {
    const permission = await getNotificationPermission().catch(() => 'prompt' as const)

    if (permission === 'granted') {
      setBlockedKind(null)

      return true
    }

    setDenied(permission === 'denied')
    setBlockedKind(kind)

    return false
  }

  /** Asks the OS for permission and hands back the kind whose save was blocked, if granted. */
  const requestPermission = async (): Promise<ReminderSaveKind | null> => {
    const kind = blockedKind

    setRequesting(true)
    try {
      const granted = await requestNotificationPermission()

      if (!granted) {
        setDenied(true)

        return null
      }

      setBlockedKind(null)
      setDenied(false)

      return kind
    } catch (err) {
      showError(toUserMessage(err, 'درخواست اجازهٔ اعلان ناموفق بود'))

      return null
    } finally {
      setRequesting(false)
    }
  }

  const reschedule = async () => {
    try {
      await refreshScheduledReminders(spreadsheetId, { force: true })
    } catch (err) {
      showError(toUserMessage(err, 'زمان‌بندی یادآوری‌ها ناموفق بود'))
    }
  }

  return {
    native,
    blockedKind,
    requesting,
    denied,
    ensurePermission,
    requestPermission,
    reschedule,
    dismiss: () => setBlockedKind(null)
  }
}
