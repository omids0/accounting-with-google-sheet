import { useEffect, useMemo, useState } from 'react'

import { createRemindersPushHandlers } from './useRemindersPushHandlers'
import { resolveVehicleReminderRule, useVehicleReminderRules } from './useVehicleReminderRules'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { isTokenValid } from '../../services/auth'
import {
  getCurrentPushSubscription,
  getNotificationPermission,
  getPushSupportStatus,
  getServiceWorkerStatus
} from '../../services/pushNotifications'
import {
  previewDueDateReminders,
  type UpcomingDueDateReminder
} from '../../services/reminderDueDates'
import { DEFAULT_RULES, fetchReminderRules, saveReminderRules } from '../../services/reminders'
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
  const vehicleRules = useVehicleReminderRules()
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

        vehicleRules.applyFetchedRules(fetchedRules)

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

  const { handleEnablePush, handleDisablePush, handleTestNotification } = useMemo(
    () =>
      createRemindersPushHandlers({
        spreadsheetId,
        setSavingKind,
        setPermission,
        setHasSubscription
      }),
    [spreadsheetId]
  )

  const handleSaveRule = async (
    kind:
      | DueDateKind
      | 'personal'
      | 'vehicle-mileage'
      | 'vehicle-deadline'
      | 'vehicle-periodic-service'
  ) => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید')

      return
    }

    const rule =
      kind === 'personal'
        ? personalRule
        : kind === 'vehicle-mileage' ||
          kind === 'vehicle-deadline' ||
          kind === 'vehicle-periodic-service'
        ? resolveVehicleReminderRule(
            kind,
            vehicleRules.vehicleMileageRule,
            vehicleRules.vehicleDeadlineRule,
            vehicleRules.vehiclePeriodicRule
          )
        : rules[kind]

    if (rule.enabled && !hasSubscription) {
      showError('برای فعال‌کردن یادآوری، ابتدا نوتیف را روشن کنید')

      return
    }

    setSavingKind(kind)
    try {
      await saveReminderRules(spreadsheetId, [rule])

      if (
        kind !== 'personal' &&
        kind !== 'vehicle-mileage' &&
        kind !== 'vehicle-deadline' &&
        kind !== 'vehicle-periodic-service'
      ) {
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
    vehicleMileageRule: vehicleRules.vehicleMileageRule,
    vehicleDeadlineRule: vehicleRules.vehicleDeadlineRule,
    vehiclePeriodicRule: vehicleRules.vehiclePeriodicRule,
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
    updatePersonalRule,
    updateVehicleMileageRule: vehicleRules.updateVehicleMileageRule,
    updateVehicleDeadlineRule: vehicleRules.updateVehicleDeadlineRule,
    updateVehiclePeriodicRule: vehicleRules.updateVehiclePeriodicRule
  }
}
