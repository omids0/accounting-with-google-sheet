import {
  personDefaultWeight,
  resolveEqualWeights,
  resolveManualWeights,
  type DangSplitWeight
} from '../../services/dangSplitMath'
import type {
  DangSplitAllocation,
  DangSplitPerson,
  DangSplitWeightMode
} from '../../types/dangSplit'

/** Two percent figures a user would call «۱۰۰»: 33.33 + 33.33 + 33.33 is accepted. */
const PERCENT_TOLERANCE = 0.05

/** Under the disabled save button; the full reason is shown once, beside the percent fields. */
export const PERCENT_SAVE_HINT = 'مجموع درصدها را اصلاح کن تا ذخیره شود'

export type AllocationDraftSeed = {
  /** Everyone the expense is currently assigned to (also a person that no longer exists). */
  selectedIds: string[]
  mode: DangSplitWeightMode
  manualPercents: Record<string, number | ''>
  /** The stored weights, kept as they are so a save without edits cannot move any balance. */
  savedWeights: DangSplitWeight[]
}

export type AllocationDraftState = Pick<AllocationDraftSeed, 'selectedIds' | 'mode'> & {
  manualPercents: Record<string, number | ''>
}

function positiveWeight(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100
}

/** Same split of the whole, whatever the scale: weights 2,2 and 1,1 are both «مساوی». */
function sameProportions(a: number[], b: number[]): boolean {
  const totalA = a.reduce((sum, value) => sum + value, 0)
  const totalB = b.reduce((sum, value) => sum + value, 0)

  if (totalA <= 0 || totalB <= 0) return false

  return a.every((value, index) => Math.abs(value / totalA - b[index] / totalB) < 1e-9)
}

/**
 * Percentages that add up to exactly 100: each is rounded to two decimals and the
 * rounding remainder goes to the largest one, as the expense shares do.
 */
function weightsToPercents(weights: DangSplitWeight[]): Record<string, number> {
  const total = weights.reduce((sum, item) => sum + positiveWeight(item.weight), 0)
  const percents: Record<string, number> = {}
  let largest = weights[0]

  for (const item of weights) {
    percents[item.personId] = roundPercent((positiveWeight(item.weight) / total) * 100)

    if (positiveWeight(item.weight) > positiveWeight(largest.weight)) largest = item
  }

  const sum = Object.values(percents).reduce((acc, value) => acc + value, 0)

  percents[largest.personId] = roundPercent(percents[largest.personId] + (100 - sum))

  return percents
}

/**
 * The draft a dialog opens with. A new expense starts empty and «مساوی». A saved one opens
 * in the mode that produced its stored weights: «مساوی» when they follow the people's
 * default weights, otherwise «دستی» with each person's real percent — so opening the dialog
 * and pressing save changes nothing.
 */
export function seedAllocationDraft(
  people: Pick<DangSplitPerson, 'id' | 'defaultWeight'>[],
  allocations: Pick<DangSplitAllocation, 'personId' | 'weight'>[]
): AllocationDraftSeed {
  const selectedIds = allocations.map(item => item.personId)
  const known = new Map(people.map(item => [item.id, item]))
  const savedWeights = allocations
    .filter(item => known.has(item.personId))
    .map(item => ({ personId: item.personId, weight: item.weight }))
  const weightValues = savedWeights.map(item => positiveWeight(item.weight))
  const defaultValues = savedWeights.map(item =>
    personDefaultWeight(known.get(item.personId) as Pick<DangSplitPerson, 'defaultWeight'>)
  )
  const total = weightValues.reduce((sum, value) => sum + value, 0)

  if (savedWeights.length === 0 || total <= 0 || sameProportions(weightValues, defaultValues)) {
    return { selectedIds, mode: 'equal', manualPercents: {}, savedWeights }
  }

  return {
    selectedIds,
    mode: 'manual',
    manualPercents: weightsToPercents(savedWeights),
    savedWeights
  }
}

/** Only the figures that are numbers; an empty field is not a percent. */
export function toNumericPercents(
  manualPercents: Record<string, number | ''>
): Record<string, number> {
  const result: Record<string, number> = {}

  for (const [personId, value] of Object.entries(manualPercents)) {
    if (value !== '' && Number.isFinite(Number(value))) {
      result[personId] = Number(value)
    }
  }

  return result
}

/** True while the draft still says what is stored. */
export function isAllocationDraftUnchanged(
  seed: AllocationDraftSeed,
  draft: AllocationDraftState
): boolean {
  if (draft.mode !== seed.mode) return false

  const seedIds = new Set(seed.selectedIds)

  if (seedIds.size !== new Set(draft.selectedIds).size) return false
  if (!draft.selectedIds.every(id => seedIds.has(id))) return false
  if (seed.mode === 'equal') return true

  return seed.selectedIds.every(
    id => (draft.manualPercents[id] ?? '') === (seed.manualPercents[id] ?? '')
  )
}

/** The weights to save: the stored ones when nothing changed, otherwise the draft's own. */
export function resolveDraftWeights({
  seed,
  draft,
  selectedPeople
}: {
  seed: AllocationDraftSeed
  draft: AllocationDraftState
  selectedPeople: DangSplitPerson[]
}): DangSplitWeight[] {
  if (isAllocationDraftUnchanged(seed, draft)) return seed.savedWeights

  return draft.mode === 'equal'
    ? resolveEqualWeights(selectedPeople)
    : resolveManualWeights(selectedPeople, toNumericPercents(draft.manualPercents))
}

function formatPercentTotal(value: number): string {
  return roundPercent(value).toLocaleString('fa-IR')
}

/**
 * Why manual percents cannot be saved, or null. A total above 100 is never valid; below 100
 * is fine only while someone is left blank to take the rest.
 */
export function manualPercentsError(
  selectedPeople: Pick<DangSplitPerson, 'id'>[],
  numericPercents: Record<string, number>
): string | null {
  const filled = selectedPeople
    .map(item => numericPercents[item.id] ?? 0)
    .filter(value => value > 0)
  const total = filled.reduce((sum, value) => sum + value, 0)

  if (total > 100 + PERCENT_TOLERANCE) {
    return `مجموع درصدها ${formatPercentTotal(total)}٪ شده و از ۱۰۰٪ بیشتر است؛ درصدها را کم کن.`
  }

  const everyoneFilled = selectedPeople.length > 0 && filled.length === selectedPeople.length

  if (everyoneFilled && total < 100 - PERCENT_TOLERANCE) {
    return `مجموع درصدها ${formatPercentTotal(
      total
    )}٪ است و به ۱۰۰٪ نمی‌رسد؛ درصد یک نفر را خالی بگذار تا بقیه را پر کند.`
  }

  return null
}
