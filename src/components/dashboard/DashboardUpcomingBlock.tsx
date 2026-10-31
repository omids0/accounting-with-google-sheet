import { useMemo } from 'react'

import { summarizeUpcoming, type DashboardReminderItem } from '../../services/dashboardReminders'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import DueItemRow from '../DueItemRow'
import { calmEmptyClass, calmListClass } from '../ui/calmListStyles'

const forecastLinkClass =
  'focus-ring-inset mt-1 flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-bg px-3 text-start text-[0.8rem] font-semibold text-primary-dark'

/** Rows shown on every screen size; «همه ←» opens the full list. */
const UPCOMING_ROWS = 5

/** «پیش رو»: the next due items (installments, checks, dang, personal, vehicle), overdue first. */
export default function DashboardUpcomingBlock({
  items,
  onViewAll,
  onOpenForecast,
  className
}: {
  items: DashboardReminderItem[]
  onViewAll: () => void
  /** «تا آخر ماه چقدر می‌ماند؟»: opens the cash forecast. */
  onOpenForecast?: () => void
  className?: string
}) {
  const { rows, overdueCount } = useMemo(
    () => summarizeUpcoming(items, undefined, UPCOMING_ROWS),
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
          {rows.map(({ item, days }) => (
            <DueItemRow key={item.id} item={item} days={days} />
          ))}
        </ul>
      )}
      {onOpenForecast ? (
        <button type="button" className={forecastLinkClass} onClick={onOpenForecast}>
          <span>تا آخر ماه چقدر می‌ماند؟</span>
          <span aria-hidden="true">←</span>
        </button>
      ) : null}
    </CalmBlock>
  )
}
