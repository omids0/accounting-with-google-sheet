import { useEffect, useState } from 'react'

import { useReminderPermission } from './useReminderPermission'
import { isTokenValid } from '../../services/auth'
import { setNightlyDigestNative } from '../../services/bankSmsNative'
import { refreshScheduledReminders } from '../../services/localNotifications'
import { DEFAULT_RULES, fetchReminderRules, saveReminderRules } from '../../services/reminders'
import { getSettings } from '../../services/settings'
import { VEHICLES_SHEET } from '../../services/sheetNames'
import { fetchSheetRows } from '../../services/sheets'
import type { ReminderKind, ReminderRule } from '../../types'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

type RulesByKind = Record<ReminderKind, ReminderRule>

function toRulesByKind(rules: ReminderRule[]): RulesByKind {
  return Object.fromEntries(rules.map(rule => [rule.kind, { ...rule }])) as RulesByKind
}

/** Reading the tab must not create it for users who never added a vehicle. */
async function hasAnyVehicle(spreadsheetId: string): Promise<boolean> {
  try {
    return (await fetchSheetRows(spreadsheetId, VEHICLES_SHEET)).length > 0
  } catch {
    return false
  }
}

export function useRemindersPage() {
  const [loading, setLoading] = useState(true)
  const [savingKind, setSavingKind] = useState<ReminderKind | null>(null)
  const [rules, setRules] = useState<RulesByKind>(() => toRulesByKind(DEFAULT_RULES))
  const [hasVehicle, setHasVehicle] = useState(false)
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const permission = useReminderPermission(spreadsheetId)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!spreadsheetId || !isTokenValid()) {
        setLoading(false)

        return
      }

      try {
        const [fetched, vehicle] = await Promise.all([
          fetchReminderRules(spreadsheetId),
          hasAnyVehicle(spreadsheetId)
        ])

        if (cancelled) return
        setRules(toRulesByKind(fetched))
        setHasVehicle(vehicle)
      } catch (err) {
        if (!cancelled) showError(toUserMessage(err, 'خطا در بارگذاری یادآوری‌ها'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [spreadsheetId])

  const persist = async (next: ReminderRule, previous: ReminderRule) => {
    setRules(current => ({ ...current, [next.kind]: next }))
    setSavingKind(next.kind)
    try {
      await saveReminderRules(spreadsheetId, [next])

      if (permission.native) {
        if (next.kind === 'nightly') await setNightlyDigestNative(next)
        await refreshScheduledReminders(spreadsheetId, { force: true })
      }
    } catch (err) {
      setRules(current => ({ ...current, [next.kind]: previous }))
      showError(toUserMessage(err, 'ذخیرهٔ یادآوری ناموفق بود'))
    } finally {
      setSavingKind(null)
    }
  }

  /** Every change saves at once; turning a reminder on first checks notification permission. */
  const changeRule = async (kind: ReminderKind, patch: Partial<ReminderRule>) => {
    if (!spreadsheetId) {
      showError('ابتدا یک شیت فعال انتخاب کنید')

      return
    }

    const previous = rules[kind]
    const next = { ...previous, ...patch }

    if (patch.enabled === true && !(await permission.ensure(kind))) return
    if (patch.enabled === false && permission.blockedKind === kind) permission.dismiss()

    await persist(next, previous)
  }

  /** «اجازه بده»: after a grant, turns on the reminder that was waiting for it. */
  const grantPermission = async () => {
    const { granted, kind } = await permission.request()

    if (!granted) return

    if (kind && !rules[kind].enabled) {
      await persist({ ...rules[kind], enabled: true }, rules[kind])
    } else if (permission.native) {
      await refreshScheduledReminders(spreadsheetId, { force: true }).catch(() => 0)
    }
  }

  return {
    loading,
    spreadsheetId,
    rules,
    savingKind,
    hasVehicle,
    permission,
    changeRule,
    grantPermission
  }
}
