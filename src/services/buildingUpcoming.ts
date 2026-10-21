import { unitCharge } from './buildingCharges'
import type { BuildingProfile } from './buildingTemplate'
import type { BuildingUnit } from './buildingUnits'
import type { DashboardReminderItem } from './dashboardReminders'
import { recurringDueDate } from './recurring'
import type { DueDateItem } from './reports'
import type { RecurringItem } from '../types'
import { getJalaliMonthKey } from '../utils/dateRange'
import {
  addJalaliMonths,
  isoToJalali,
  JALALI_MONTHS,
  jalaliToIso,
  daysInJalaliMonth
} from '../utils/jalaliDate'

const statusOf = (date: string, today: string): DashboardReminderItem['status'] =>
  date < today ? 'overdue' : date === today ? 'today' : 'upcoming'

/** The day of the next issue: this month's issue day if it is still ahead, else next month's. */
export function nextIssueDate(issueDay: number, todayIso: string): string {
  const { year, month } = isoToJalali(todayIso)

  const thisMonth = jalaliToIso(year, month, Math.min(issueDay, daysInJalaliMonth(year, month)))

  return thisMonth >= todayIso ? thisMonth : addJalaliMonths(todayIso, 1, issueDay)
}

/** The next time `item` falls due: this month's day if not past, else next month's. */
function nextRecurringDate(item: RecurringItem, todayIso: string): string {
  const thisMonth = recurringDueDate(item, getJalaliMonthKey(todayIso))

  return thisMonth >= todayIso ? thisMonth : addJalaliMonths(todayIso, 1, item.dayOfMonth)
}

/**
 * «پیش رو» of a building: the next charge issue (with what it will bill), the monthly recurring
 * items and the checks due within the horizon. Rows reuse the personal dashboard's shape so the
 * same `DueItemRow` renders them.
 */
export function buildingUpcoming(input: {
  profile: Pick<BuildingProfile, 'issueDay' | 'defaultCharge' | 'chargeMethod' | 'vacancyRule'>
  units: BuildingUnit[]
  recurring: RecurringItem[]
  /** Unpaid checks as the due-date report maps them. */
  checks: DueDateItem[]
  todayIso: string
}): DashboardReminderItem[] {
  const { profile, units, recurring, checks, todayIso } = input

  const active = units.filter(unit => unit.active)

  const issueDate = nextIssueDate(profile.issueDay, todayIso)

  const billed = active.reduce((sum, unit) => sum + unitCharge(profile, unit, active), 0)

  const issue: DashboardReminderItem = {
    id: `building_issue_${issueDate}`,
    kind: 'personal',
    kindLabel: 'شارژ',
    title: `صدور شارژ ${JALALI_MONTHS[isoToJalali(issueDate).month - 1]}`,
    subtitle: `${active.length.toLocaleString('fa-IR')} واحد`,
    dueDate: issueDate,
    amount: billed,
    status: statusOf(issueDate, todayIso)
  }

  const repeats = recurring
    .filter(item => item.active)
    .map((item): DashboardReminderItem => {
      const dueDate = nextRecurringDate(item, todayIso)

      return {
        id: `building_recurring_${item.id}`,
        kind: 'personal',
        kindLabel: 'تکرار',
        title: item.title || item.category,
        subtitle: 'تکرار ماهانه',
        dueDate,
        amount: item.amount,
        status: statusOf(dueDate, todayIso)
      }
    })

  const checkItems = checks.map(
    (item): DashboardReminderItem => ({
      id: `building_check_${item.id}`,
      kind: 'checks',
      kindLabel: 'چک',
      title: item.title,
      subtitle: item.subtitle,
      dueDate: item.dueDate,
      amount: item.amount,
      status: item.status
    })
  )

  return [issue, ...repeats, ...checkItems]
}
