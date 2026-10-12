import {
  getCurrentPushSubscription,
  getDeviceLabel,
  showLocalTestNotification,
  subscribeToPush,
  unsubscribeFromPush
} from '../../services/pushNotifications'
import { removePushSubscription, upsertPushSubscription } from '../../services/reminders'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

/** Asks the browser for permission (if needed) and registers this device in the sheet. */
export async function subscribeThisDevice(spreadsheetId: string): Promise<void> {
  const subscription = await subscribeToPush()

  await upsertPushSubscription(spreadsheetId, {
    endpoint: subscription.endpoint!,
    p256dh: subscription.keys!.p256dh!,
    auth: subscription.keys!.auth!,
    deviceLabel: getDeviceLabel(),
    updatedAt: new Date().toISOString()
  })
}

/** Web push actions of the advanced (developer) section. */
export function createRemindersPushHandlers(options: {
  spreadsheetId: string
  setBusy: (busy: boolean) => void
  onChanged: () => void
}) {
  const { spreadsheetId, setBusy, onChanged } = options

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    setBusy(true)
    try {
      await action()
      showSuccess(success)
    } catch (err) {
      showError(toUserMessage(err, failure))
    } finally {
      setBusy(false)
      onChanged()
    }
  }

  const handleEnablePush = () => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید')

      return Promise.resolve()
    }

    return run(
      () => subscribeThisDevice(spreadsheetId),
      'اعلان روشن شد و این دستگاه ثبت شد',
      'روشن کردن اعلان ناموفق بود'
    )
  }

  const handleDisablePush = () =>
    run(
      async () => {
        const current = await getCurrentPushSubscription()

        if (current?.endpoint && spreadsheetId) {
          await removePushSubscription(spreadsheetId, current.endpoint)
        }
        await unsubscribeFromPush()
      },
      'اعلان این دستگاه خاموش شد',
      'خاموش کردن اعلان ناموفق بود'
    )

  const handleTestNotification = () =>
    run(showLocalTestNotification, 'اعلان آزمایشی فرستاده شد', 'فرستادن اعلان آزمایشی ناموفق بود')

  return { handleEnablePush, handleDisablePush, handleTestNotification }
}
