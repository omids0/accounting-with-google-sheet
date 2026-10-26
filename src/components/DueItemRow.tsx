import DayBadge from './DayBadge'
import MoneyText from './MoneyText'
import { formatDueRelative, type DashboardReminderItem } from '../services/dashboardReminders'
import { cn } from '../utils/cn'
import {
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowSubDangerClass,
  calmRowSubWarningClass,
  calmRowTitleClass
} from './ui/calmListStyles'

/**
 * One due item in a calm list: day badge · title and «معوق · ۵ روز گذشته» ·
 * amount (masked in hidden-amounts mode). Used by «پیش رو» and the calendar.
 */
export default function DueItemRow({
  item,
  days,
  showMonth = true
}: {
  item: DashboardReminderItem
  /** Days from today to the due date; negative once overdue. */
  days: number
  showMonth?: boolean
}) {
  const overdue = item.status === 'overdue'
  const lateIncoming = overdue && item.incoming === true
  const when = formatDueRelative(item.status, days)

  return (
    <li className={calmRowClass}>
      <DayBadge date={item.dueDate} showMonth={showMonth} danger={overdue && !lateIncoming} />
      <span className={calmRowMainClass}>
        <span className={calmRowTitleClass}>
          {item.kind === 'checks'
            ? [item.title, item.kindLabel, item.subtitle].filter(Boolean).join(' · ')
            : item.title}
        </span>
        <span
          className={cn(
            calmRowSubClass,
            overdue && !lateIncoming && calmRowSubDangerClass,
            lateIncoming && calmRowSubWarningClass
          )}
        >
          {lateIncoming ? when.replace('معوق', 'معوق دریافتی') : when}
        </span>
      </span>
      {item.amount > 0 ? (
        <span className={calmRowEndClass}>
          <MoneyText amount={item.amount} />
        </span>
      ) : null}
    </li>
  )
}
