import { useCallback, useEffect, useRef, useState } from 'react'

import { isNativePlatform } from '../services/googleAuthNative'
import {
  getNotificationPermission,
  refreshScheduledReminders,
  requestNotificationPermission,
  showTestNotification,
  type LocalNotificationPermission
} from '../services/localNotifications'
import { getSettings } from '../services/settings'
import { showError, showSuccess } from '../utils/toast'

export function useLocalReminders(): {
  supported: boolean
  permission: LocalNotificationPermission
  scheduledCount: number
  busy: boolean
  enable: () => Promise<void>
  sendTest: () => Promise<void>
} {
  const [permission, setPermission] = useState<LocalNotificationPermission>('prompt')

  const [scheduledCount, setScheduledCount] = useState(0)

  const [busy, setBusy] = useState(false)

  const mounted = useRef(true)

  const reschedule = useCallback(async (force = false) => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    const count = await refreshScheduledReminders(spreadsheetId, { force })

    if (mounted.current) setScheduledCount(count)
  }, [])

  useEffect(() => {
    mounted.current = true

    if (!isNativePlatform()) return

    void (async () => {
      const current = await getNotificationPermission()

      if (!mounted.current) return
      setPermission(current)

      if (current !== 'granted') {
        setScheduledCount(0)

        return
      }

      await reschedule()
    })()

    return () => {
      mounted.current = false
    }
  }, [reschedule])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const granted = await requestNotificationPermission()

      setPermission(granted ? 'granted' : 'denied')

      if (!granted) {
        showError('اجازه ارسال اعلان داده نشد')

        return
      }

      await reschedule(true)
      showSuccess('یادآوری‌ها روی این دستگاه زمان‌بندی شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'زمان‌بندی یادآوری‌ها ناموفق بود')
    } finally {
      setBusy(false)
    }
  }, [reschedule])

  const sendTest = useCallback(async () => {
    try {
      await showTestNotification()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ارسال اعلان آزمایشی ناموفق بود')
    }
  }, [])

  return {
    supported: isNativePlatform(),
    permission,
    scheduledCount,
    busy,
    enable,
    sendTest
  }
}
