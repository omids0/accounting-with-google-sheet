import { useCallback, useEffect, useMemo, useState } from 'react'

import type { PlanWithRow } from './types'
import { isInstallmentPlanComplete, isInstallmentPlanVisible } from '../../services/installments'
import { installmentDueSpan } from '../../services/installmentSchedulePreview'
import type { DateRange } from '../../utils/jalaliDate'

/**
 * Keeps plans from vanishing behind the list's period. A plan the user just saved (or opened
 * from the search: `highlightId`) widens the period to its schedule when it would be hidden;
 * `hiddenPlanCount` and `showAllPlans` serve the notice for plans hidden by the period.
 */
export function useInstallmentPlanReveal(
  plans: PlanWithRow[],
  effectiveRange: DateRange,
  highlightId: string | null | undefined,
  showRange: (range: DateRange) => void
) {
  const [revealId, setRevealId] = useState<string | null>(null)

  const targetId = highlightId ?? revealId

  useEffect(() => {
    const plan = targetId ? plans.find(item => item.id === targetId) : undefined

    // A plan just saved is not in the list until it reloads: wait for it.
    if (!plan) return

    if (!isInstallmentPlanVisible(plan, effectiveRange)) {
      const span = installmentDueSpan([plan])

      if (span) showRange(span)
    }
    // One look per save; later filter changes by the user are respected.
    if (!highlightId) setRevealId(null)
  }, [targetId, highlightId, plans, effectiveRange, showRange])

  // A finished plan is meant to drop out of the period; only a plan with something left to pay counts.
  const hiddenPlans = useMemo(
    () =>
      plans.filter(
        plan => !isInstallmentPlanComplete(plan) && !isInstallmentPlanVisible(plan, effectiveRange)
      ),
    [plans, effectiveRange]
  )

  const showAllPlans = useCallback(() => {
    const span = installmentDueSpan(hiddenPlans)

    if (!span) return
    // Keeps what the period already shows.
    showRange({
      start: span.start < effectiveRange.start ? span.start : effectiveRange.start,
      end: span.end > effectiveRange.end ? span.end : effectiveRange.end
    })
  }, [hiddenPlans, effectiveRange, showRange])

  return { revealPlan: setRevealId, hiddenPlanCount: hiddenPlans.length, showAllPlans }
}
