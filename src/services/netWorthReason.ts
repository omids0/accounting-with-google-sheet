import type { CategorySummary, VaultAction } from '../types'
import { isDateInRange, type DateRange } from '../utils/dateRange'

/** A dated vault trade or goal transfer, already named («فروش طلا», «واریز به هدف «سفر»»). */
export interface NetWorthEvent {
  date: string
  text: string
}

/** Parts a reason line joins at most. */
const REASON_PARTS = 2

export function vaultEventText(action: VaultAction, classLabel: string): string {
  return `${action === 'sell' ? 'فروش' : 'خرید'} ${classLabel}`
}

/** Distinct event texts dated inside `range`, in date order. */
export function eventsInRange(events: NetWorthEvent[], range: DateRange): string[] {
  const texts = events
    .filter(event => isDateInRange(event.date, range))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(event => event.text)

  return [...new Set(texts)]
}

/**
 * One line for a month in «بیشترین رشد» / «بیشترین افت»: its top income (rise)
 * or expense (fall) category, then the month's first vault/goal event, else the
 * second category — «عیدی + فروش طلا». Empty when the month has neither.
 */
export function netWorthReason({
  direction,
  income,
  expense,
  events
}: {
  direction: 'rise' | 'fall'
  income: CategorySummary[]
  expense: CategorySummary[]
  events: string[]
}): string {
  const categories = (direction === 'rise' ? income : expense)
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(item => item.name)

  const parts = [...categories.slice(0, 1), ...events, ...categories.slice(1)]

  return [...new Set(parts)].slice(0, REASON_PARTS).join(' + ')
}
