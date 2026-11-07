import { useState } from 'react'

import { canStepForward, stepMonth } from './childViewModel'
import { monthKeyOfIso, monthLabel } from '../../services/buildingMonths'
import { getTodayIso } from '../../utils/jalaliDate'

/** The month a child page shows (today's at first) and the stepper's two moves. */
export function useChildMonth(initial?: string) {
  const current = monthKeyOfIso(getTodayIso())
  const [month, setMonth] = useState(initial || current)

  return {
    month,
    label: monthLabel(month),
    previous: () => setMonth(value => stepMonth(value, -1)),
    next: () => setMonth(value => (canStepForward(value, current) ? stepMonth(value, 1) : value)),
    canNext: canStepForward(month, current)
  }
}

export type ChildMonth = ReturnType<typeof useChildMonth>
