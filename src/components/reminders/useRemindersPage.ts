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
  previewDueDateReminders,
  type UpcomingDueDateReminder
} from '../../services/reminderDueDates'
import {
  DEFAULT_RULES,
  fetchReminderRules,
  removePushSubscription,
  saveReminderRules,
  upsertPushSubscription
} from '../../services/reminders'
import { getSettings } from '../../services/settings'
import type { ReminderKind, ReminderRule } from '../../types'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { showError, showSuccess } from '../../utils/toast'

const DUE_DATE_KINDS = ['installments', 'checks', 'dang'] as const

type DueDateKind = (typeof DUE_DATE_KINDS)[number]

function buildDefaultRulesMap(): Record<DueDateKind, ReminderRule> {
  const defaults = Object.fromEntries(
    DEFAULT_RULES.filter(rule => DUE_DATE_KINDS.includes(rule.kind as DueDateKind)).map(rule => [
      rule.kind,
      { ...rule }
    ])
  ) as Record<DueDateKind, ReminderRule>

  return defaults
}

export function useRemindersPage() {
  const [loading, setLoading] = useState(true)
  const [savingKind, setSavingKind] = useState<ReminderKind | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [rules, setRules] = useState<Record<DueDateKind, ReminderRule>>(buildDefaultRulesMap)
  const [personalRule, setPersonalRule] = useState<ReminderRule>({
    kind: 'personal',
    enabled: false,
    daysBefore: 0,
    hour: 9,
    minute: 0
  })
  const [previews, setPreviews] = useState<Record<DueDateKind, UpcomingDueDateReminder[]>>({
    installments: [],
    checks: [],
    dang: []
  })
  const [permission, setPermission] = useState(getNotificationPermission())
  const [hasSubscription, setHasSubscription] = useState(false)
  const [swStatus, setSwStatus] = useState<'ready' | 'pending' | 'missing'>('pending')

  const pushStatus = getPushSupportStatus()
  const { canInstall, isInstalled, showIosHint, isIos, install, dismissIosHint } = usePwaInstall()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  const refreshPreview = async (kind: DueDateKind, nextRule: ReminderRule) => {
    if (!spreadsheetId) return

    try {
      const upcoming = await previewDueDateReminders(spreadsheetId, kind, nextRule)

      setPreviews(current => ({ ...current, [kind]: upcoming }))
    } catch {
      /* ignore preview errors while editing */
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!spreadsheetId || !isTokenValid()) {
        setLoading(false)

        return
      }

      try {
        const fetchedRules = await fetchReminderRules(spreadsheetId)

        if (cancelled) return

        const nextRules = buildDefaultRulesMap()

        for (const kind of DUE_DATE_KINDS) {
          const rule = fetchedRules.find(item => item.kind === kind)

          if (rule) nextRules[kind] = rule
        }

        setRules(nextRules)

        const personal = fetchedRules.find(item => item.kind === 'personal')

        if (personal) setPersonalRule(personal)

        const previewEntries = await Promise.all(
          DUE_DATE_KINDS.map(
            async kind =>
              [kind, await previewDueDateReminders(spreadsheetId, kind, nextRules[kind])] as const
          )
        )

        if (!cancelled) {
          setPreviews(
            Object.fromEntries(previewEntries) as Record<DueDateKind, UpcomingDueDateReminder[]>
          )
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

  const previewLinesByKind = useMemo(
    () =>
      Object.fromEntries(
        DUE_DATE_KINDS.map(kind => [
          kind,
          previews[kind].map(item => `${item.body} (${formatIsoDatePersian(item.remindOn)})`)
        ])
      ) as Record<DueDateKind, string[]>,
    [previews]
  )

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

  const handleSaveRule = async (kind: DueDateKind | 'personal') => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید')

      return
    }

    const rule = kind === 'personal' ? personalRule : rules[kind]

    if (rule.enabled && !hasSubscription) {
      showError('برای فعال‌کردن یادآوری، ابتدا نوتیف را روشن کنید')

      return
    }

    setSavingKind(kind)
    try {
      await saveReminderRules(spreadsheetId, [rule])

      if (kind !== 'personal') {
        const upcoming = await previewDueDateReminders(spreadsheetId, kind, rule)

        setPreviews(current => ({ ...current, [kind]: upcoming }))
      }

      showSuccess('تنظیمات یادآوری ذخیره شد')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ذخیره ناموفق بود')
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

  const updateRule = (kind: DueDateKind, patch: Partial<ReminderRule>) => {
    setRules(current => {
      const next = { ...current[kind], ...patch }

      void refreshPreview(kind, next)

      return { ...current, [kind]: next }
    })
  }

  const updatePersonalRule = (patch: Partial<ReminderRule>) => {
    setPersonalRule(current => ({ ...current, ...patch }))
  }

  return {
    loading,
    saving: savingKind !== null,
    savingKind,
    showSetup,
    setShowSetup,
    rules,
    personalRule,
    previewLinesByKind,
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
    updateRule,
    updatePersonalRule
  }
}
