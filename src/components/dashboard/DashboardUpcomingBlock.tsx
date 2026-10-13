import { useMemo } from 'react'

import {
  formatDueRelative,
  summarizeUpcoming,
  type DashboardReminderItem
} from '../../services/dashboardReminders'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import DayBadge from '../DayBadge'
import MoneyText from '../MoneyText'
import {
  calmEmptyClass,
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowSubDangerClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

/** «پیش رو»: the next three due items (installments, checks, dang, personal, vehicle), overdue first. */
export default function DashboardUpcomingBlock({
  items,
  onViewAll,
  className
}: {
  items: DashboardReminderItem[]
  onViewAll: () => void
  className?: string
}) {
  const { rows, overdueCount } = useMemo(() => summarizeUpcoming(items), [items])

  return (
    <CalmBlock
      className={className}
      title="پیش رو"
      badge={overdueCount > 0 ? `· ${formatPersianNumber(overdueCount)} معوق` : undefined}
      action={{ label: 'همه ←', onClick: onViewAll }}
    >
      {!rows.length ? (
        <p className={calmEmptyClass}>تا ۳۰ روز آینده موعدی نیست</p>
      ) : (
        <ul className={calmListClass}>
          {rows.map(({ item, days }) => {
            const overdue = item.status === 'overdue'

            return (
              <li key={item.id} className={calmRowClass}>
                <DayBadge date={item.dueDate} showMonth danger={overdue} />
                <span className={calmRowMainClass}>
                  <span className={calmRowTitleClass}>
                    {item.subtitle && item.kind === 'checks'
                      ? `${item.title} · ${item.subtitle}`
                      : item.title}
                  </span>
                  <span className={cn(calmRowSubClass, overdue && calmRowSubDangerClass)}>
                    {formatDueRelative(item.status, days)}
                  </span>
                </span>
                {item.amount > 0 ? (
                  <span className={calmRowEndClass}>
                    <MoneyText amount={item.amount} />
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </CalmBlock>
  )
}
