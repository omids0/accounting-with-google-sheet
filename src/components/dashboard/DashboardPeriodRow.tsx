import { formatTodayLabel } from '../../utils/periodLabel'
import AppIcon from '../AppIcon'
import DesktopHeaderPortal from '../layout/DesktopHeaderPortal'
import {
  dashboardPeriodChipClass,
  dashboardPeriodRowClass,
  dashboardPeriodTodayClass
} from '../ui/dashboardCalmStyles'

/** «مهر ۱۴۰۵ ▾» (opens the date-range filter) and today's date; in the header on desktop. */
export default function DashboardPeriodRow({
  label,
  onOpen
}: {
  label: string
  onOpen: () => void
}) {
  return (
    <DesktopHeaderPortal>
      <div className={dashboardPeriodRowClass}>
        <button
          type="button"
          className={dashboardPeriodChipClass}
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`دوره: ${label} — تغییر بازه`}
        >
          {label}
          <AppIcon name="chevron-down" size={14} />
        </button>
        <span className={dashboardPeriodTodayClass}>{formatTodayLabel()}</span>
      </div>
    </DesktopHeaderPortal>
  )
}
