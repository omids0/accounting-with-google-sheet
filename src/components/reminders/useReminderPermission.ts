import { App } from '@capacitor/app'
import { useCallback, useEffect, useState } from 'react'

import { isNativePlatform } from '../../services/googleAuthNative'
import {
  getNotificationPermission as getNativePermission,
  requestNotificationPermission
} from '../../services/localNotifications'
import {
  getCurrentPushSubscription,
  getNotificationPermission as getWebPermission,
  getPushSupportStatus,
  subscribeThisDevice
} from '../../services/pushNotifications'
import type { ReminderKind } from '../../types'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

/** `unsupported`: this browser cannot receive reminders (no push, iOS outside the home screen). */
export type ReminderPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking'

async function readStatus(native: boolean): Promise<ReminderPermissionStatus> {
  if (native) return getNativePermission().catch(() => 'prompt' as const)

  if (getPushSupportStatus() !== 'supported') return 'unsupported'

  const permission = getWebPermission()

  if (permission === 'denied') return 'denied'
  if (permission !== 'granted') return 'prompt'

  // On the web the reminders come from the sheet's cron, so this device must be registered too.
  const subscription = await getCurrentPushSubscription().catch(() => null)

  return subscription?.endpoint ? 'granted' : 'prompt'
}

/** Re-reads the status when the user comes back, e.g. from the phone or browser settings. */
function useStatusRefresh(native: boolean, refresh: () => void) {
  useEffect(() => {
    refresh()

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)

    const resume = native ? App.addListener('resume', refresh) : null

    let permissionStatus: PermissionStatus | null = null

    if (!native && navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then(status => {
          permissionStatus = status
          status.addEventListener('change', refresh)
        })
        .catch(() => {})
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      void resume?.then(handle => handle.remove())
      permissionStatus?.removeEventListener('change', refresh)
    }
  }, [native, refresh])
}

/**
 * Notification permission for reminders: the OS permission in the APK (reminders are
 * scheduled on the device), a push subscription on the web. It is only requested after
 * the user turns a reminder on or taps «اجازه بده».
 */
export function useReminderPermission(spreadsheetId: string) {
  const native = isNativePlatform()

  const [status, setStatus] = useState<ReminderPermissionStatus>('checking')

  const [blockedKind, setBlockedKind] = useState<ReminderKind | null>(null)

  const [requesting, setRequesting] = useState(false)

  const refresh = useCallback(() => {
    void readStatus(native).then(setStatus)
  }, [native])

  useStatusRefresh(native, refresh)

  /** True when an enabled rule may be saved; otherwise the inline prompt shows under `kind`. */
  const ensure = async (kind: ReminderKind): Promise<boolean> => {
    const current = await readStatus(native)

    setStatus(current)

    // A browser without push still saves the rule: the user's other devices get it.
    if (current === 'granted' || current === 'unsupported') {
      setBlockedKind(null)

      return true
    }

    setBlockedKind(kind)

    return false
  }

  /** Asks the OS or browser; on success returns the kind whose save was waiting (or null). */
  const request = async (): Promise<{ granted: boolean; kind: ReminderKind | null }> => {
    const kind = blockedKind

    setRequesting(true)
    try {
      if (native && !(await requestNotificationPermission())) {
        setStatus('denied')

        return { granted: false, kind: null }
      }
      if (!native) await subscribeThisDevice(spreadsheetId)
      setStatus('granted')
      setBlockedKind(null)

      return { granted: true, kind }
    } catch (err) {
      const next = await readStatus(native)

      setStatus(next)
      if (next !== 'denied') showError(toUserMessage(err, 'روشن کردن اعلان ناموفق بود'))

      return { granted: false, kind: null }
    } finally {
      setRequesting(false)
    }
  }

  return {
    native,
    status,
    blockedKind,
    requesting,
    ensure,
    request,
    refresh,
    dismiss: () => setBlockedKind(null)
  }
}

export type ReminderPermission = ReturnType<typeof useReminderPermission>
