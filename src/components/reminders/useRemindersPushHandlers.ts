import {
  getCurrentPushSubscription,
  getDeviceLabel,
  getNotificationPermission,
  showLocalTestNotification,
  subscribeToPush,
  unsubscribeFromPush
} from '../../services/pushNotifications'
import { removePushSubscription, upsertPushSubscription } from '../../services/reminders'
import type { ReminderKind } from '../../types'
import { showError, showSuccess } from '../../utils/toast'

export function createRemindersPushHandlers(options: {
  spreadsheetId: string
  setSavingKind: (kind: ReminderKind | null) => void
  setPermission: (value: ReturnType<typeof getNotificationPermission>) => void
  setHasSubscription: (value: boolean) => void
}) {
  const { spreadsheetId, setSavingKind, setPermission, setHasSubscription } = options

  const handleEnablePush = async () => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید')

      return
    }

    setSavingKind('daily')
    try {
      const subscription = await subscribeToPush()

      await upsertPushSubscription(spreadsheetId, {
        endpoint: subscription.endpoint!,
        p256dh: subscription.keys!.p256dh!,
        auth: subscription.keys!.auth!,
        deviceLabel: getDeviceLabel(),
        updatedAt: new Date().toISOString()
      })
      setPermission(getNotificationPermission())
      setHasSubscription(true)
      showSuccess('نوتیف فعال شد و این دستگاه ثبت گردید')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'فعال‌سازی نوتیف ناموفق بود')
    } finally {
      setSavingKind(null)
    }
  }

  const handleDisablePush = async () => {
    setSavingKind('daily')
    try {
      const current = await getCurrentPushSubscription()

      if (current?.endpoint && spreadsheetId) {
        await removePushSubscription(spreadsheetId, current.endpoint)
      }
      await unsubscribeFromPush()
      setHasSubscription(false)
      setPermission(getNotificationPermission())
      showSuccess('نوتیف این دستگاه غیرفعال شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'غیرفعال‌سازی ناموفق بود')
    } finally {
      setSavingKind(null)
    }
  }

  const handleTestNotification = async () => {
    setSavingKind('daily')
    try {
      await showLocalTestNotification()
      showSuccess('نوتیف تست ارسال شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ارسال تست ناموفق بود')
    } finally {
      setSavingKind(null)
    }
  }

  return { handleEnablePush, handleDisablePush, handleTestNotification }
}
