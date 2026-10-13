import { useNavigate } from 'react-router'

import { monthlyReportPath } from '../../routes/paths'
import { markMonthlyReportHandled } from '../../services/monthlyReportGate'
import { formatJalaliMonthLabel } from '../../utils/dateRange'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { discoveryRowCloseClass } from '../ui/dashboardCalmStyles'
import {
  guideCardClass,
  guideCardHintClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

interface DashboardMonthlyReportCardProps {
  spreadsheetId: string
  /** Jalali `YYYY-MM` of the month that just ended. */
  monthKey: string
}

/** «گزارش مهر آماده است»: first day of the month from 09:00, until viewed or closed. */
export default function DashboardMonthlyReportCard({
  spreadsheetId,
  monthKey
}: DashboardMonthlyReportCardProps) {
  const navigate = useNavigate()
  const monthName = formatJalaliMonthLabel(monthKey).split(' ')[0]

  return (
    <Card className={guideCardClass}>
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="pdf" size={20} />
      </span>
      <div className={guideCardTextClass}>
        <span className={guideCardTitleClass}>{`گزارش ${monthName} آماده است`}</span>
        <span className={guideCardHintClass}>یک صفحه · درآمد، هزینه، بودجه، اقساط</span>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          markMonthlyReportHandled(spreadsheetId)
          navigate(monthlyReportPath(monthKey))
        }}
      >
        ببین
      </Button>
      <button
        type="button"
        className={discoveryRowCloseClass}
        onClick={() => markMonthlyReportHandled(spreadsheetId)}
        aria-label={`بستن گزارش ${monthName}`}
        title="بستن"
      >
        <AppIcon name="close" size={16} />
      </button>
    </Card>
  )
}
