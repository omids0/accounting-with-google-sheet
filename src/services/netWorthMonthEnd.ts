import type { NetWorthSnapshot } from './netWorth'

/** Where a month-end figure comes from: the stored row, the rebuild from records, or today's value. */
export type NetWorthBasis = 'snapshot' | 'rebuilt' | 'today'

export interface MonthEndNetWorth {
  value: number
  basis: NetWorthBasis
}

export interface MonthEndSource {
  snapshots: NetWorthSnapshot[]
  /** The rebuild from records (`monthEndNetWorthReader`); `null` or absent when it is impossible. */
  rebuild?: ((monthKey: string) => number | null) | null
  /** Today's value; only ever offered, flagged, for the month just ended. */
  todayNetWorth?: number | null
  /** The month before today's. */
  lastMonthKey?: string
}

/**
 * «دارایی قابل اتکا» at the end of a closed month: its stored snapshot, else the rebuilt value, else
 * (only for the month just ended, and flagged `today`) today's value, so a report never passes
 * today's number off as the month's. A month that is not closed yet has no end-of-month figure.
 */
export function netWorthAtMonthEnd(
  monthKey: string,
  source: MonthEndSource
): MonthEndNetWorth | null {
  const stored = source.snapshots.find(item => item.monthKey === monthKey)

  if (stored) return { value: stored.netWorth, basis: 'snapshot' }
  if (!source.lastMonthKey || monthKey > source.lastMonthKey) return null

  const rebuilt = source.rebuild?.(monthKey)

  if (rebuilt != null) return { value: rebuilt, basis: 'rebuilt' }
  if (monthKey === source.lastMonthKey && source.todayNetWorth != null) {
    return { value: source.todayNetWorth, basis: 'today' }
  }

  return null
}
