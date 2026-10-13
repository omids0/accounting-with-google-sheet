import {
  largestChanges,
  netWorthChanges,
  yearStartValue,
  type NetWorthSnapshot,
  type NetWorthSource
} from './netWorth'
import { listRecentJalaliMonthKeys, previousJalaliMonthKey } from '../utils/dateRange'

/** Months the «۱۲ ماه اخیر» chart shows. */
export const NET_WORTH_TREND_MONTHS = 12

export interface NetWorthValues {
  netWorth: number
  assets: number
  liabilities: number
}

/** A month on the chart; the current month is today's live value. */
export interface NetWorthPoint extends NetWorthValues {
  monthKey: string
  source: NetWorthSource | 'live'
}

export interface NetWorthMove {
  monthKey: string
  change: number
  reason: string
}

export interface NetWorthTrend {
  today: NetWorthValues
  currentMonthKey: string
  /** Oldest first; months without a snapshot are left out. */
  points: NetWorthPoint[]
  /** Today minus the end of last year; `null` without a value for it. */
  sinceYearStart: number | null
  /** Today minus the end of last month; `null` without its snapshot. */
  sincePrevMonth: number | null
  rises: NetWorthMove[]
  falls: NetWorthMove[]
}

export type NetWorthReasonFor = (monthKey: string, direction: 'rise' | 'fall') => string

export function buildNetWorthTrend({
  snapshots,
  today,
  currentMonthKey,
  reasonFor
}: {
  snapshots: NetWorthSnapshot[]
  today: NetWorthValues
  currentMonthKey: string
  reasonFor: NetWorthReasonFor
}): NetWorthTrend {
  const byMonth = new Map(snapshots.map(item => [item.monthKey, item]))

  const points = listRecentJalaliMonthKeys(currentMonthKey, NET_WORTH_TREND_MONTHS).flatMap(
    (monthKey): NetWorthPoint[] => {
      if (monthKey === currentMonthKey) return [{ monthKey, ...today, source: 'live' }]

      const snapshot = byMonth.get(monthKey)

      return snapshot
        ? [
            {
              monthKey,
              netWorth: snapshot.netWorth,
              assets: snapshot.assets,
              liabilities: snapshot.liabilities,
              source: snapshot.source
            }
          ]
        : []
    }
  )

  const { rises, falls } = largestChanges(netWorthChanges(points))
  const withReason =
    (direction: 'rise' | 'fall') =>
    ({ monthKey, change }: { monthKey: string; change: number }): NetWorthMove => ({
      monthKey,
      change,
      reason: reasonFor(monthKey, direction)
    })

  const yearStart = yearStartValue(snapshots, currentMonthKey)
  const previous = byMonth.get(previousJalaliMonthKey(currentMonthKey))

  return {
    today,
    currentMonthKey,
    points,
    sinceYearStart: yearStart == null ? null : today.netWorth - yearStart,
    sincePrevMonth: previous ? today.netWorth - previous.netWorth : null,
    rises: rises.map(withReason('rise')),
    falls: falls.map(withReason('fall'))
  }
}
