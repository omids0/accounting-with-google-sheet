import { cn } from '../utils/cn'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { formatDayBadge } from '../utils/periodLabel'
import { normalizeSheetDate } from '../utils/sheetValues'
import {
  calmDayBadgeClass,
  calmDayBadgeDangerClass,
  calmDayBadgeMonthClass
} from './ui/calmListStyles'

/** Day (and optionally month) of a date in a small rounded square at the start of a row. */
export default function DayBadge({
  date,
  showMonth = false,
  danger = false
}: {
  date: string
  showMonth?: boolean
  danger?: boolean
}) {
  const { day, month } = formatDayBadge(date)

  return (
    <span className={cn(calmDayBadgeClass, danger && calmDayBadgeDangerClass)}>
      <span aria-hidden="true">{day}</span>
      {showMonth ? (
        <span aria-hidden="true" className={cn('calm-badge-month', calmDayBadgeMonthClass)}>
          {month}
        </span>
      ) : null}
      <span className="sr-only">{formatIsoDatePersian(normalizeSheetDate(date) || date)}</span>
    </span>
  )
}
