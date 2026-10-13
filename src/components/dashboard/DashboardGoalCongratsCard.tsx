import { useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { dismissGoalCongrats, getPendingGoalCongrats } from '../../services/goalCongrats'
import { getSettings } from '../../services/settings'
import { setTreasuryClassFilter } from '../../services/treasuryClassPref'
import { useNavigationStore } from '../../stores/navigationStore'
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

/** «به هدف «سفر عید» رسیدی»: once per reached savings goal, until dismissed. */
export default function DashboardGoalCongratsCard() {
  const spreadsheetId = getSettings()?.spreadsheetId
  const revision = useDataRefresh()
  const [pending, setPending] = useState(() => getPendingGoalCongrats(spreadsheetId))

  useEffect(() => {
    setPending(getPendingGoalCongrats(spreadsheetId))
  }, [spreadsheetId, revision])

  const goal = pending[0]

  if (!goal || !spreadsheetId) return null

  const dismiss = () => {
    dismissGoalCongrats(spreadsheetId, goal.id)
    setPending(getPendingGoalCongrats(spreadsheetId))
  }

  return (
    <Card className={guideCardClass} role="status">
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="treasury" size={20} />
      </span>
      <div className={guideCardTextClass}>
        <span className={guideCardTitleClass}>{`تبریک! به هدف «${goal.title}» رسیدی`}</span>
        <span className={guideCardHintClass}>پس‌اندازش کامل شد</span>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          setTreasuryClassFilter(spreadsheetId, 'goals')
          useNavigationStore.getState().onNavigateDashboard('treasury')
        }}
      >
        ببین
      </Button>
      <button
        type="button"
        className={discoveryRowCloseClass}
        onClick={dismiss}
        aria-label="بستن تبریک"
        title="بستن"
      >
        <AppIcon name="close" size={16} />
      </button>
    </Card>
  )
}
