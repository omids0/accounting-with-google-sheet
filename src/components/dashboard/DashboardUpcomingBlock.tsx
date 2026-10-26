import { useMemo } from 'react'

import { summarizeUpcoming, type DashboardReminderItem } from '../../services/dashboardReminders'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import DueItemRow from '../DueItemRow'
import { calmEmptyClass, calmListClass } from '../ui/calmListStyles'

/** Rows shown on desktop; phones and tablets keep the first three. */
const DESKTOP_ROWS = 5
const COMPACT_ROWS = 3

/** «پیش رو»: the next due items (installments, checks, dang, personal, vehicle), overdue first. */
export default function DashboardUpcomingBlock({
  items,
  onViewAll,
  className
}: {
  items: DashboardReminderItem[]
  onViewAll: () => void
  className?: string
}) {
  const { rows, overdueCount } = useMemo(
    () => summarizeUpcoming(items, undefined, DESKTOP_ROWS),
    [items]
  )

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
          {rows.map(({ item, days }, index) => (
            <DueItemRow
              key={item.id}
              item={item}
              days={days}
              className={index >= COMPACT_ROWS ? 'max-xl:hidden' : undefined}
            />
          ))}
        </ul>
      )}
    </CalmBlock>
  )
}
