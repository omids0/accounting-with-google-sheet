import type { DateRange, RecordsDatePreset } from './dateRange'

/**
 * The period a page hands to the report it opens (the dashboard's «جزئیات ←»), so the report shows
 * the same numbers instead of falling back to «این ماه». `useReportDateFilter` reads it once when
 * it mounts; it is a one-shot hand-over, not a setting, and goes stale after `MAX_AGE_MS`.
 */
export interface ReportPeriodHandoff {
  preset: RecordsDatePreset
  customRange: DateRange
}

/** The route changes right after the hand-over; anything older was never picked up. */
const MAX_AGE_MS = 10_000

let pending: (ReportPeriodHandoff & { at: number }) | null = null

export function handOffReportPeriod(period: ReportPeriodHandoff, now = Date.now()): void {
  pending = { ...period, at: now }
}

/** Reads without clearing, so a double-invoked initializer sees the same value. */
export function peekReportPeriod(now = Date.now()): ReportPeriodHandoff | null {
  if (!pending || now - pending.at > MAX_AGE_MS) return null

  return { preset: pending.preset, customRange: pending.customRange }
}

export function clearReportPeriod(): void {
  pending = null
}
