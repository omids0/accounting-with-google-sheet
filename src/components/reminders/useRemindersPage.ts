import { useEffect, useMemo, useState } from 'react'

import { usePwaInstall } from '../../hooks/usePwaInstall'
import { isTokenValid } from '../../services/auth'
import {
  getCurrentPushSubscription,
  getDeviceLabel,
  getNotificationPermission,
  getPushSupportStatus,
  getServiceWorkerStatus,
  showLocalTestNotification,
  subscribeToPush,
  unsubscribeFromPush
} from '../../services/pushNotifications'
import {
  fetchReminderRules,
  formatInstallmentReminderMessage,
  previewInstallmentReminders,
  removePushSubscription,
  saveReminderRules,
  upsertPushSubscription,
  type UpcomingInstallmentReminder
} from '../../services/reminders'
import { getSettings } from '../../services/settings'
import type { ReminderRule } from '../../types'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { showError, showSuccess } from '../../utils/toast'

export function useRemindersPage() {
  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [showSetup, setShowSetup] = useState(false)

  const [installmentsRule, setInstallmentsRule] = useState<ReminderRule>({
    kind: 'installments',
    enabled: false,
    daysBefore: 1,
    hour: 9,
    minute: 0
  })

  const [preview, setPreview] = useState<UpcomingInstallmentReminder[]>([])

  const [permission, setPermission] = useState(getNotificationPermission())

  const [hasSubscription, setHasSubscription] = useState(false)

  const [swStatus, setSwStatus] = useState<'ready' | 'pending' | 'missing'>('pending')

  const pushStatus = getPushSupportStatus()

  const { canInstall, isInstalled, showIosHint, isIos, install, dismissIosHint } = usePwaInstall()

  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!spreadsheetId || !isTokenValid()) {
        setLoading(false)

        return
      }

      try {
        const rules = await fetchReminderRules(spreadsheetId)

        const installments = rules.find(rule => rule.kind === 'installments')

        if (installments && !cancelled) {
          setInstallmentsRule(installments)

          const upcoming = await previewInstallmentReminders(spreadsheetId, installments)

          if (!cancelled) setPreview(upcoming)
        }
      } catch (err) {
        if (!cancelled) {
          showError(err instanceof Error ? err.message : 'خطا در بارگذاری یادآوری‌ها')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }

      try {
        const sub = await getCurrentPushSubscription()

        if (!cancelled) setHasSubscription(!!sub?.endpoint)

        const status = await getServiceWorkerStatus()

        if (!cancelled) setSwStatus(status)
      } catch {
        if (!cancelled) {
          setHasSubscription(false)
          setSwStatus('missing')
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [spreadsheetId])

  const previewLines = useMemo(
    () =>
      preview.map(item => {
        const message = formatInstallmentReminderMessage(item)

        return `${message.body} (${formatIsoDatePersian(item.remindOn)})`
      }),
    [preview]
  )

  const handleEnablePush = async () => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید')

      return
    }

    setSaving(true)
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
      setSaving(false)
    }
  }

  const handleDisablePush = async () => {
    setSaving(true)
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
      setSaving(false)
    }
  }

  const handleSaveRule = async () => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید')

      return
    }
    if (installmentsRule.enabled && !hasSubscription) {
      showError('برای فعال‌کردن یادآوری، ابتدا نوتیف را روشن کنید')

      return
    }

    setSaving(true)
    try {
      await saveReminderRules(spreadsheetId, [installmentsRule])

      const upcoming = await previewInstallmentReminders(spreadsheetId, installmentsRule)

      setPreview(upcoming)
      showSuccess('تنظیمات یادآوری ذخیره شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ذخیره ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async () => {
    setSaving(true)
    try {
      await showLocalTestNotification()
      showSuccess('نوتیف تست ارسال شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ارسال تست ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const refreshPreview = async (nextRule: ReminderRule) => {
    if (!spreadsheetId) return
    try {
      const upcoming = await previewInstallmentReminders(spreadsheetId, nextRule)

      setPreview(upcoming)
    } catch {
      /* ignore preview errors while editing */
    }
  }

  const updateInstallmentsRule = (patch: Partial<ReminderRule>) => {
    setInstallmentsRule(current => {
      const next = { ...current, ...patch }

      void refreshPreview(next)

      return next
    })
  }

  return {
    loading,
    saving,
    showSetup,
    setShowSetup,
    installmentsRule,
    previewLines,
    permission,
    hasSubscription,
    swStatus,
    pushStatus,
    canInstall,
    isInstalled,
    showIosHint,
    isIos,
    install,
    dismissIosHint,
    handleEnablePush,
    handleDisablePush,
    handleSaveRule,
    handleTestNotification,
    updateInstallmentsRule
  }
}
