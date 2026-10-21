import { isUnitComplete } from './completeUnitForm'
import {
  JOURNEY_STEPS,
  stepNumber,
  type JourneyState,
  type JourneyStepKey
} from '../../services/buildingJourney'
import type { StayWithRow } from '../../services/buildingResidents'
import type { UnitWithRow } from '../../services/buildingUnits'
import type { Counterparty } from '../../types'

/** What the setup card needs to know about a building. */
export interface SetupSnapshot {
  /** Null = no journey row (a connected sheet): nothing left to set up. */
  journey: JourneyState | null
  /** Units whose owner is still the «مالک واحد N» placeholder. */
  placeholderOwners: number
}

export type SetupReason = 'journey' | 'people'

export type ChecklistStatus = 'done' | 'skipped' | 'current' | 'todo'

/** How many units still wait for a real owner (the automatic charge issue waits for zero). */
export function placeholderOwnerCount(
  units: UnitWithRow[],
  stays: StayWithRow[],
  persons: (Counterparty & { rowNumber: number })[]
): number {
  return units.filter(unit => !isUnitComplete(unit, stays, persons)).length
}

/**
 * Where the dashboard's setup card sends the manager: the step the journey stopped on, or —
 * once the journey is finished — the completion flow while any unit still has a placeholder owner.
 */
export function nextSetupStep(
  snapshot: SetupSnapshot
): { step: JourneyStepKey; reason: SetupReason } | null {
  const { journey, placeholderOwners } = snapshot

  if (journey && !journey.finished) return { step: journey.step, reason: 'journey' }

  return placeholderOwners > 0 ? { step: 'people', reason: 'people' } : null
}

export function setupChecklist(
  journey: JourneyState
): { key: JourneyStepKey; title: string; status: ChecklistStatus }[] {
  const current = stepNumber(journey.step)

  return JOURNEY_STEPS.map((step, index) => ({
    key: step.key,
    title: step.title,
    status: journey.skipped.includes(step.key)
      ? 'skipped'
      : journey.finished || journey.done.includes(step.key)
      ? 'done'
      : index + 1 === current
      ? 'current'
      : 'todo'
  }))
}
