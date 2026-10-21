import { useMemo } from 'react'

import BuildingBlock from './BuildingBlock'
import { summarizeUpcoming, type DashboardReminderItem } from '../../services/dashboardReminders'
import { formatPersianNumber } from '../../utils/formatMoney'
import DueItemRow from '../DueItemRow'
import { buildingEmptyClass } from '../ui/buildingStyles'
import { calmListClass } from '../ui/calmListStyles'

/** «پیش رو» of a building: the next charge issue, recurring items and checks, three rows. */
export default function BuildingUpcomingBlock({
  items,
  className
}: {
  items: DashboardReminderItem[]
  className?: string
}) {
  const { rows, overdueCount } = useMemo(() => summarizeUpcoming(items), [items])

  return (
    <BuildingBlock
      className={className}
      title="پیش رو"
      badge={overdueCount > 0 ? `· ${formatPersianNumber(overdueCount)} معوق` : undefined}
    >
      {!rows.length ? (
        <p className={buildingEmptyClass}>تا ۳۰ روز آینده موعدی نیست</p>
      ) : (
        <ul className={calmListClass}>
          {rows.map(({ item, days }) => (
            <DueItemRow key={item.id} item={item} days={days} />
          ))}
        </ul>
      )}
    </BuildingBlock>
  )
}
