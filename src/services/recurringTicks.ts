import type { RecurringStatus } from './recurringStatus'
import type { RecurringItem } from '../types'

/**
 * The items «ثبت همه» would post: the user's own tick per item, else on only for an item nothing
 * like it is recorded for. Until the statuses are known (`null`) nothing is ticked, so nothing can
 * be posted on a guess.
 */
export function tickedIds(
  items: readonly RecurringItem[],
  statuses: ReadonlyMap<string, RecurringStatus> | null,
  choices: ReadonlyMap<string, boolean>
): Set<string> {
  if (!statuses) return new Set()

  return new Set(
    items
      .filter(item => choices.get(item.id) ?? (statuses.get(item.id)?.kind ?? 'new') === 'new')
      .map(item => item.id)
  )
}
