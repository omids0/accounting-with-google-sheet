import { useMemo } from 'react'

import { summarizeUpcoming, type DashboardReminderItem } from '../../services/dashboardReminders'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import DueItemRow from '../DueItemRow'
import { calmEmptyClass, calmListClass } from '../ui/calmListStyles'

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
          {rows.map(({ item, days }) => (
            <DueItemRow key={item.id} item={item} days={days} />
          ))}
        </ul>
      )}
    </CalmBlock>
  )
}
