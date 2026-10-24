import { useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import {
  dismissGoalCongrats,
  getPendingGoalCongrats,
  resetGoalCongrats
} from '../../services/goalCongrats'
import { isGoalReached } from '../../services/savingsGoals'
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

  /** Ids of the goals whose balance is at or over the target right now; null until known. */
  const [reachedIds, setReachedIds] = useState<Set<string> | null>(null)

  useEffect(() => {
    setPending(getPendingGoalCongrats(spreadsheetId))
  }, [spreadsheetId, revision])

  // The stored congratulation is only a queue: the card shows while the goal still holds its
  // target, and a goal that fell back under it is forgotten so reaching it again earns a new card.
  // A new array every refresh: key the effect by the ids so a refresh reads the sheet once.
  const pendingKey = pending.map(item => item.id).join(',')

  useEffect(() => {
    const pendingIds = pendingKey ? pendingKey.split(',') : []

    if (!spreadsheetId || pendingIds.length === 0) return

    let cancelled = false

    void import('../../services/savingsGoalsSheet')
      .then(({ loadSavingsGoals }) => loadSavingsGoals(spreadsheetId))
      .then(goals => {
        if (cancelled) return

        const reached = new Set(
          goals
            .filter(item => item.status !== 'archived' && isGoalReached(item.balance, item.target))
            .map(item => item.id)
        )

        pendingIds
          .filter(id => !reached.has(id))
          .forEach(id => resetGoalCongrats(spreadsheetId, id))
        setReachedIds(reached)
      })
      .catch(() => {
        if (!cancelled) setReachedIds(null)
      })

    return () => {
      cancelled = true
    }
  }, [spreadsheetId, pendingKey, revision])

  const goal = pending.find(item => reachedIds?.has(item.id))

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
