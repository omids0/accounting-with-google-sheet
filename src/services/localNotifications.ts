import { LocalNotifications } from '@capacitor/local-notifications'

import { setNightlyDigestNative } from './bankSmsNative'
import { fetchChecks } from './checks'
import { fetchDangs } from './dang'
import { isNativePlatform } from './googleAuthNative'
import { fetchInstallmentPlans } from './installments'
import { fetchPersonalReminders, getUpcomingPersonalReminderPushes } from './personalReminders'
import { getUpcomingDueDateReminders } from './reminderDueDates'
import { DEFAULT_RULES, fetchReminderRules, formatDailyEngagementMessage } from './reminders'
import type { ReminderKind, ReminderRule } from '../types'
import { addDaysToIso, getTodayIso } from '../utils/jalaliDate'

/** Android keeps pending alarms cheaply, but a month is as far as the data stays trustworthy. */
const HORIZON_DAYS = 30

const MAX_SCHEDULED = 64

/**
 * Own channel instead of the plugin's fallback, which is literally named "Default",
 * sits at IMPORTANCE_DEFAULT (no heads-up banner) and plays its sound through the
 * alarm stream.
 */
const REMINDER_CHANNEL_ID = 'reminders'

let channelReady: Promise<void> | null = null

function ensureReminderChannel(): Promise<void> {
  if (!channelReady) {
    channelReady = LocalNotifications.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'یادآوری‌ها',
      description: 'یادآوری اقساط، چک‌ها، قرض‌ها و یادآوری‌های شخصی',
      importance: 5,
      visibility: 1,
      vibration: true
    }).catch(() => {
      // A failed channel still leaves the plugin's fallback, so schedule anyway.
      channelReady = null
    })
  }

  return channelReady
}

export type LocalNotificationPermission = 'granted' | 'denied' | 'prompt'

interface PlannedNotification {
  id: number
  title: string
  body: string
  at: Date
}

/** Notification ids must be 32-bit ints, so derive a stable one from the reminder reference. */
function notificationId(reference: string): number {
  let hash = 0

  for (let index = 0; index < reference.length; index += 1) {
    hash = (hash * 31 + reference.charCodeAt(index)) | 0
  }

  return hash >>> 1
}

function scheduledAt(dayIso: string, rule: ReminderRule): Date {
  const day = dayIso.slice(0, 10)
  const hour = String(rule.hour).padStart(2, '0')
  const minute = String(rule.minute).padStart(2, '0')

  return new Date(`${day}T${hour}:${minute}:00`)
}

/** The nightly digest is a native alarm; it only needs the rule's switch and time. */
async function syncNightlyDigestRule(rules: ReminderRule[]): Promise<void> {
  const rule =
    rules.find(item => item.kind === 'nightly') ??
    DEFAULT_RULES.find(item => item.kind === 'nightly')!

  await setNightlyDigestNative(rule)
}

/**
 * "You did not open the app yesterday": every launch moves the single pending nudge to
 * the day after tomorrow, so it only fires after a full day without opening the app.
 */
function planDailyNudge(rule: ReminderRule | undefined, today: string): PlannedNotification[] {
  if (!rule) return []

  return [
    {
      id: notificationId('daily_engagement'),
      ...formatDailyEngagementMessage(),
      at: scheduledAt(addDaysToIso(today, 2), rule)
    }
  ]
}

async function collectPlanned(spreadsheetId: string): Promise<PlannedNotification[]> {
  const rules = await fetchReminderRules(spreadsheetId)

  await syncNightlyDigestRule(rules)

  const ruleFor = (kind: ReminderKind): ReminderRule | undefined =>
    rules.find(rule => rule.kind === kind && rule.enabled)

  const installmentsRule = ruleFor('installments')

  const checksRule = ruleFor('checks')

  const dangRule = ruleFor('dang')

  const personalRule = ruleFor('personal')

  const [plans, checks, dangs, personalItems] = await Promise.all([
    installmentsRule ? fetchInstallmentPlans(spreadsheetId) : [],
    checksRule ? fetchChecks(spreadsheetId) : [],
    dangRule ? fetchDangs(spreadsheetId) : [],
    personalRule ? fetchPersonalReminders(spreadsheetId) : []
  ])

  const today = getTodayIso()

  const planned: PlannedNotification[] = planDailyNudge(ruleFor('daily'), today)

  for (let offset = 0; offset <= HORIZON_DAYS; offset += 1) {
    const dayIso = addDaysToIso(today, offset)

    const dueDateSources = [
      { rule: installmentsRule, kind: 'installments' as const, data: plans },
      { rule: checksRule, kind: 'checks' as const, data: checks },
      { rule: dangRule, kind: 'dang' as const, data: dangs }
    ]

    for (const source of dueDateSources) {
      if (!source.rule) continue

      for (const reminder of getUpcomingDueDateReminders(
        source.kind,
        source.data,
        source.rule,
        dayIso
      )) {
        planned.push({
          id: notificationId(reminder.reference),
          title: reminder.title,
          body: reminder.body,
          at: scheduledAt(dayIso, source.rule)
        })
      }
    }

    if (!personalRule) continue

    for (const reminder of getUpcomingPersonalReminderPushes(personalItems, dayIso)) {
      planned.push({
        id: notificationId(reminder.reference),
        title: reminder.title,
        body: reminder.body,
        at: scheduledAt(dayIso, personalRule)
      })
    }
  }

  const now = Date.now()

  const unique = new Map<number, PlannedNotification>()

  for (const item of planned) {
    if (item.at.getTime() <= now) continue
    if (!unique.has(item.id)) unique.set(item.id, item)
  }

  return [...unique.values()]
    .sort((first, second) => first.at.getTime() - second.at.getTime())
    .slice(0, MAX_SCHEDULED)
}

export async function getNotificationPermission(): Promise<LocalNotificationPermission> {
  if (!isNativePlatform()) return 'denied'

  const { display } = await LocalNotifications.checkPermissions()

  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false

  if ((await getNotificationPermission()) === 'granted') return true

  const { display } = await LocalNotifications.requestPermissions()

  return display === 'granted'
}

/** Rebuilding reads several sheets, so app-open callers only do it once per launch. */
let refreshedThisSession = false

/**
 * Replaces every pending reminder with a freshly computed schedule. Rules and due
 * dates change in the sheet, so the whole set is rebuilt rather than patched.
 */
export async function refreshScheduledReminders(
  spreadsheetId: string,
  { force = false }: { force?: boolean } = {}
): Promise<number> {
  if (!isNativePlatform() || !spreadsheetId) return 0
  if (refreshedThisSession && !force) return countScheduledReminders()
  if ((await getNotificationPermission()) !== 'granted') return 0

  refreshedThisSession = true

  const planned = await collectPlanned(spreadsheetId)

  const pending = await LocalNotifications.getPending()

  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel(pending)
  }

  if (planned.length === 0) return 0

  await ensureReminderChannel()

  await LocalNotifications.schedule({
    notifications: planned.map(item => ({
      id: item.id,
      title: item.title,
      body: item.body,
      channelId: REMINDER_CHANNEL_ID,
      schedule: { at: item.at, allowWhileIdle: true }
    }))
  })

  return planned.length
}

export async function countScheduledReminders(): Promise<number> {
  if (!isNativePlatform()) return 0

  return (await LocalNotifications.getPending()).notifications.length
}

export async function showTestNotification(): Promise<void> {
  await ensureReminderChannel()

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1,
        title: 'یادآوری آزمایشی',
        body: 'اعلان‌های این دستگاه فعال است.',
        channelId: REMINDER_CHANNEL_ID,
        schedule: { at: new Date(Date.now() + 3000) }
      }
    ]
  })
}

/** «به هدف «سفر عید» رسیدی»: once, when a deposit fills a savings goal. */
export async function showGoalReachedNotification(goalId: string, title: string): Promise<void> {
  if (!isNativePlatform() || (await getNotificationPermission()) !== 'granted') return

  await ensureReminderChannel()
  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId(`goal_${goalId}`),
        title: 'تبریک! به هدف رسیدی',
        body: `پس‌انداز «${title}» کامل شد.`,
        channelId: REMINDER_CHANNEL_ID,
        schedule: { at: new Date(Date.now() + 1000) }
      }
    ]
  })
}
