import { fetchPersonalReminders } from './personalReminders'
import { getReminderKindLabel } from './reminders'
import { loadDueDatesReport, type DueDateItem, type DueDateStatus } from './reports'
import { addDaysToIso, getTodayIso } from '../utils/jalaliDate'

export type DashboardReminderKind = 'installments' | 'checks' | 'dang' | 'personal'

export interface DashboardReminderItem {
  id: string
  kind: DashboardReminderKind
  kindLabel: string
  title: string
  subtitle: string
  dueDate: string
  amount: number
  status: DueDateStatus
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
    kindLabel: getReminderKindLabel(kind),
    title: item.title,
    subtitle: item.subtitle,
    dueDate: item.dueDate,
    amount: item.amount,
    status: item.status
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

  const [dueItems, personalItems] = await Promise.all([
    loadDueDatesReport(spreadsheetId, horizonDays).catch(() => [] as DueDateItem[]),
    fetchPersonalReminders(spreadsheetId).catch(() => [])
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

  return [...dueItems.map(mapDueDateItem), ...personalMapped]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit)
}
