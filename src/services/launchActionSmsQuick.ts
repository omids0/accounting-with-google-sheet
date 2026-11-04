import type { BankSmsReviewItem } from './bankSmsQueue'
import type { LaunchAction } from './launchAction'
import type { WorkspaceType } from './workspace'

export type SingleSmsItem = Extract<BankSmsReviewItem, { kind: 'single' }>

/**
 * The SMS id a launch action wants in the quick sheet, or `null` when it opens a page instead:
 * only a personal workspace has a queue the sheet can work on (a building routes deposits to units
 * and a shared account has no SMS queue), so there the notification keeps opening «پیامک‌های بانکی».
 */
export function quickSmsIdFor(action: LaunchAction, workspace: WorkspaceType): string | null {
  return action.kind === 'smsQuick' && workspace === 'personal' ? action.id : null
}

/** The card the sheet shows: a recognised single SMS (not a transfer pair, not an unknown text). */
export function findQuickItem(
  items: readonly BankSmsReviewItem[],
  id: string
): SingleSmsItem | null {
  const item = items.find(candidate => candidate.key === id)

  return item?.kind === 'single' && item.entry.result.kind !== 'unknown' ? item : null
}

export type QuickSmsState =
  /** The queue is still being read; show nothing yet. */
  | { state: 'wait' }
  | { state: 'show'; item: SingleSmsItem }
  /** Never was a card here (already handled, a transfer pair, unknown text): open the page instead. */
  | { state: 'fallback' }
  /** The card was shown and has left the list (saved, dismissed, recorded): close the sheet. */
  | { state: 'done' }

/**
 * What the sheet does for `id`. `settled` = the queue and the templates finished loading, so an
 * absent id really is absent; `wasShown` = the card was on screen before (it then left on purpose).
 */
export function quickSmsState(input: {
  id: string
  items: readonly BankSmsReviewItem[]
  settled: boolean
  wasShown: boolean
}): QuickSmsState {
  const item = findQuickItem(input.items, input.id)

  if (item) return { state: 'show', item }
  if (input.wasShown) return { state: 'done' }

  return input.settled ? { state: 'fallback' } : { state: 'wait' }
}
