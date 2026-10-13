import { parseJalaliMonthKey, previousJalaliMonthKey } from '../utils/dateRange'
import { parseNumeric } from '../utils/parseNumeric'

/** `auto`: written on the first open of the next month; `rebuilt`: from records; `manual`: edited. */
export type NetWorthSource = 'auto' | 'rebuilt' | 'manual'

/** One row of «دارایی ماهانه»: the selected assets and liabilities at the end of a month. */
export interface NetWorthSnapshot {
  monthKey: string
  netWorth: number
  assets: number
  liabilities: number
  recordedAt: string
  source: NetWorthSource
}

/** Per spreadsheet, in localStorage: the month whose open already ran, and the one-time rebuild. */
export interface NetWorthGate {
  checkedMonth?: string
  rebuiltAt?: string
}

/** Months the one-time rebuild reaches back at most (the chart shows 12, the hero needs Esfand). */
export const NET_WORTH_REBUILD_MAX_MONTHS = 24

const SOURCES: NetWorthSource[] = ['auto', 'rebuilt', 'manual']

export function rowToNetWorthSnapshot(row: string[]): NetWorthSnapshot | null {
  const monthKey = String(row[0] ?? '').trim()

  if (!parseJalaliMonthKey(monthKey)) return null

  const source = String(row[5] ?? '').trim() as NetWorthSource

  return {
    monthKey,
    netWorth: parseNumeric(row[1]),
    assets: parseNumeric(row[2]),
    liabilities: parseNumeric(row[3]),
    recordedAt: String(row[4] ?? ''),
    source: SOURCES.includes(source) ? source : 'auto'
  }
}

export function netWorthSnapshotToRow(snapshot: NetWorthSnapshot): string[] {
  return [
    snapshot.monthKey,
    String(snapshot.netWorth),
    String(snapshot.assets),
    String(snapshot.liabilities),
    snapshot.recordedAt,
    snapshot.source
  ]
}

/**
 * The month whose snapshot the first open of `currentMonthKey` writes: the previous
 * one, once per month, and only when the sheet has no row for it yet.
 */
export function snapshotMonthToWrite(
  gate: NetWorthGate,
  currentMonthKey: string,
  existingMonths: ReadonlySet<string>
): string | null {
  if (gate.checkedMonth === currentMonthKey) return null

  const previous = previousJalaliMonthKey(currentMonthKey)

  return existingMonths.has(previous) ? null : previous
}

/**
 * Months the one-time rebuild fills: from the first month with records (at most
 * `maxMonths` back) up to the month before the first snapshot, skipping months
 * that already have a row. Never the current month.
 */
export function monthsToRebuild(
  earliestMonthKey: string | null,
  existingMonths: ReadonlySet<string>,
  currentMonthKey: string,
  maxMonths = NET_WORTH_REBUILD_MAX_MONTHS
): string[] {
  if (!earliestMonthKey) return []

  const firstSnapshot = [...existingMonths].sort()[0]
  const end = firstSnapshot && firstSnapshot < currentMonthKey ? firstSnapshot : currentMonthKey
  const months: string[] = []
  let cursor = previousJalaliMonthKey(end)

  while (cursor >= earliestMonthKey && months.length < maxMonths) {
    if (!existingMonths.has(cursor)) months.unshift(cursor)
    cursor = previousJalaliMonthKey(cursor)
  }

  return months
}

/** A month and its value change since the month before it. */
export interface NetWorthChange {
  monthKey: string
  change: number
}

/** Month-over-month changes between consecutive months of a series (oldest first). */
export function netWorthChanges(
  points: { monthKey: string; netWorth: number }[]
): NetWorthChange[] {
  const changes: NetWorthChange[] = []

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]
    const point = points[i]

    if (previousJalaliMonthKey(point.monthKey) !== previous.monthKey) continue
    changes.push({ monthKey: point.monthKey, change: point.netWorth - previous.netWorth })
  }

  return changes
}

/** «بیشترین رشد» / «بیشترین افت»: the `count` largest rises and falls, largest first. */
export function largestChanges(
  changes: NetWorthChange[],
  count = 3
): { rises: NetWorthChange[]; falls: NetWorthChange[] } {
  return {
    rises: changes
      .filter(item => item.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, count),
    falls: changes
      .filter(item => item.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, count)
  }
}

/** Value at the end of last Esfand, else the earliest snapshot of this year. */
export function yearStartValue(
  snapshots: NetWorthSnapshot[],
  currentMonthKey: string
): number | null {
  const year = parseJalaliMonthKey(currentMonthKey)?.year

  if (year == null) return null

  const lastEsfand = snapshots.find(item => item.monthKey === `${year - 1}-12`)

  if (lastEsfand) return lastEsfand.netWorth

  const thisYear = snapshots
    .filter(item => item.monthKey.startsWith(`${year}-`) && item.monthKey < currentMonthKey)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))

  return thisYear[0]?.netWorth ?? null
}
