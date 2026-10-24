import { fetchPersonalReminders } from './personalReminders'
import { getReminderKindLabel } from './reminders'
import { loadDueDatesReport, type DueDateItem, type DueDateStatus } from './reports'
import { fetchVehicleDashboardReminderItems } from './vehicleDashboardReminders'
import { formatPersianNumber } from '../utils/formatMoney'
import { addDaysToIso, diffIsoDays, getTodayIso } from '../utils/jalaliDate'

export type DashboardReminderKind = 'installments' | 'checks' | 'dang' | 'personal' | 'vehicle'

export interface DashboardReminderItem {
  id: string
  kind: DashboardReminderKind
  kindLabel: string
  title: string
  subtitle: string
  dueDate: string
  amount: number
  status: DueDateStatus
  /** Money coming in (a received check): late is not a debt, so it is not shown as danger. */
  incoming?: boolean
}

export const DASHBOARD_REMINDERS_HORIZON_DAYS = 30

export const DASHBOARD_REMINDERS_LIMIT = 8

function getPersonalReminderDueStatus(dueDate: string, todayIso = getTodayIso()): DueDateStatus {
  const today = todayIso.slice(0, 10)
  const normalized = dueDate.slice(0, 10)

  if (normalized < today) return 'overdue'
  if (normalized === today) return 'today'

  return 'upcoming'
}

function mapDueDateItem(item: DueDateItem): DashboardReminderItem {
  const kind: DashboardReminderKind =
    item.type === 'installment' ? 'installments' : item.type === 'check' ? 'checks' : 'dang'

  return {
    id: `${item.type}_${item.id}`,
    kind,
    kindLabel: item.label ?? getReminderKindLabel(kind),
    title: item.title,
    subtitle: item.subtitle,
    dueDate: item.dueDate,
    amount: item.amount,
    status: item.status,
    incoming: item.incoming
  }
}

export async function fetchDashboardReminderItems(
  spreadsheetId: string,
  options?: { limit?: number; horizonDays?: number }
): Promise<DashboardReminderItem[]> {
  const limit = options?.limit ?? DASHBOARD_REMINDERS_LIMIT
  const horizonDays = options?.horizonDays ?? DASHBOARD_REMINDERS_HORIZON_DAYS
  const today = getTodayIso().slice(0, 10)
  const horizonEnd = addDaysToIso(today, horizonDays).slice(0, 10)

  const [dueItems, personalItems, vehicleItems] = await Promise.all([
    loadDueDatesReport(spreadsheetId, horizonDays).catch(() => [] as DueDateItem[]),
    fetchPersonalReminders(spreadsheetId).catch(() => []),
    fetchVehicleDashboardReminderItems(spreadsheetId).catch(() => [])
  ])

  const personalMapped: DashboardReminderItem[] = personalItems
    .filter(item => item.enabled && item.dueDate)
    .filter(item => item.dueDate.slice(0, 10) <= horizonEnd)
    .map(item => ({
      id: `personal_${item.id}`,
      kind: 'personal' as const,
      kindLabel: getReminderKindLabel('personal'),
      title: item.title.trim() || item.category || 'یادآوری',
      subtitle: item.category || 'سایر',
      dueDate: item.dueDate.slice(0, 10),
      amount: item.amount,
      status: getPersonalReminderDueStatus(item.dueDate, today)
    }))

  const vehicleMapped = vehicleItems.filter(item => {
    const due = item.dueDate.slice(0, 10)

    return due <= horizonEnd
  })

  return orderDashboardReminders([
    ...dueItems.map(mapDueDateItem),
    ...personalMapped,
    ...vehicleMapped
  ]).slice(0, limit)
}

const STATUS_RANK: Record<DueDateStatus, number> = { overdue: 0, today: 1, upcoming: 2 }

/** Overdue first (oldest first), then today, then upcoming by date. */
export function orderDashboardReminders<
  T extends Pick<DashboardReminderItem, 'status' | 'dueDate'>
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status]

    if (statusDiff !== 0) return statusDiff

    return a.dueDate.localeCompare(b.dueDate)
  })
}

export interface UpcomingRow {
  item: DashboardReminderItem
  /** Days from today to the due date; negative once overdue. */
  days: number
}

export interface UpcomingSummary {
  rows: UpcomingRow[]
  overdueCount: number
}

/** The dashboard «پیش رو» block: the first `limit` items, overdue leading, and the overdue count. */
export function summarizeUpcoming(
  items: DashboardReminderItem[],
  todayIso: string = getTodayIso(),
  limit = 3
): UpcomingSummary {
  const ordered = orderDashboardReminders(items)

  return {
    rows: ordered
      .slice(0, limit)
      .map(item => ({ item, days: diffIsoDays(todayIso, item.dueDate) })),
    overdueCount: ordered.filter(item => item.status === 'overdue').length
  }
}

/** «معوق · ۵ روز گذشته», «امروز», «۱۵ روز دیگر». */
export function formatDueRelative(status: DueDateStatus, days: number): string {
  if (status === 'overdue') {
    return days < 0 ? `معوق · ${formatPersianNumber(-days)} روز گذشته` : 'معوق'
  }
  if (status === 'today' || days <= 0) return 'امروز'

  return `${formatPersianNumber(days)} روز دیگر`
}
