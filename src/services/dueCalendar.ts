import type { DashboardReminderItem } from './dashboardReminders'
import { getJalaliMonthRange } from '../utils/dateRange'
import { formatPersianNumber } from '../utils/formatMoney'
import { buildIcsCalendar, type IcsAllDayEvent } from '../utils/ics'
import { addJalaliMonths, getTodayIso, isoToJalali } from '../utils/jalaliDate'

type DueDated = Pick<DashboardReminderItem, 'dueDate' | 'status'>

export interface DueDaySummary {
  count: number
  overdue: boolean
}

/** Overdue: flagged so when loaded, or its date is already behind today. */
export function isDueItemOverdue(item: DueDated, todayIso: string = getTodayIso()): boolean {
  return item.status === 'overdue' || item.dueDate.slice(0, 10) < todayIso.slice(0, 10)
}

/** Items grouped by their `YYYY-MM-DD` due day, keeping the input order inside a day. */
export function bucketDueItemsByDay<T extends Pick<DashboardReminderItem, 'dueDate'>>(
  items: T[]
): Map<string, T[]> {
  const buckets = new Map<string, T[]>()

  for (const item of items) {
    const day = item.dueDate.slice(0, 10)
    const bucket = buckets.get(day)

    if (bucket) bucket.push(item)
    else buckets.set(day, [item])
  }

  return buckets
}

/** Per day: how many items fall on it and whether any of them is overdue (the red day). */
export function summarizeDueDays(
  items: DueDated[],
  todayIso: string = getTodayIso()
): Map<string, DueDaySummary> {
  const summaries = new Map<string, DueDaySummary>()

  for (const [day, dayItems] of bucketDueItemsByDay(items)) {
    summaries.set(day, {
      count: dayItems.length,
      overdue: dayItems.some(item => isDueItemOverdue(item, todayIso))
    })
  }

  return summaries
}

/** Items due inside the Jalali month `YYYY-MM`, by date. */
export function dueItemsInMonth<T extends Pick<DashboardReminderItem, 'dueDate'>>(
  items: T[],
  monthKey: string
): T[] {
  const range = getJalaliMonthRange(monthKey)

  if (!range) return []

  return items
    .filter(item => {
      const day = item.dueDate.slice(0, 10)

      return day >= range.start && day <= range.end
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/** Last day the phone-calendar export covers: the same day twelve Jalali months ahead. */
export function dueCalendarHorizonEnd(todayIso: string = getTodayIso()): string {
  return addJalaliMonths(todayIso, 12, isoToJalali(todayIso).day)
}

const SUMMARY_PREFIX: Partial<Record<DashboardReminderItem['kind'], string>> = {
  installments: 'قسط',
  checks: 'چک',
  dang: 'بدهی'
}

/** «قسط وام مسکن · ۳٬۰۰۰٬۰۰۰»: kind word (unless the title already starts with it) and amount. */
export function dueItemIcsSummary(item: DashboardReminderItem): string {
  const title = item.title.trim()
  const prefix = SUMMARY_PREFIX[item.kind]
  const named = prefix && !title.startsWith(prefix) ? `${prefix} ${title}` : title

  return item.amount > 0 ? `${named} · ${formatPersianNumber(item.amount)}` : named
}

/** Phone calendar file of every item due from today through twelve months ahead. */
export function buildDueDatesIcs(
  items: DashboardReminderItem[],
  { todayIso = getTodayIso(), now = new Date() }: { todayIso?: string; now?: Date } = {}
): { content: string; count: number } {
  const start = todayIso.slice(0, 10)
  const end = dueCalendarHorizonEnd(start)
  const events: IcsAllDayEvent[] = items
    .filter(item => {
      const day = item.dueDate.slice(0, 10)

      return day >= start && day <= end
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))
    .map(item => ({
      uid: `${item.id}@personal-accounting-pwa`,
      date: item.dueDate.slice(0, 10),
      summary: dueItemIcsSummary(item),
      description: [item.kindLabel, item.subtitle].filter(Boolean).join(' · '),
      alarmDaysBefore: 1
    }))

  return {
    content: buildIcsCalendar(events, {
      prodId: '-//Hesab Ketab//Due dates//FA',
      name: 'سررسیدهای حساب کتاب',
      now
    }),
    count: events.length
  }
}
