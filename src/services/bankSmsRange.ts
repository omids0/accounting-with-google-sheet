/** «Show SMS from» choices, in calendar days counting today. */
export const SMS_RANGE_OPTIONS = [
  { id: '1', label: 'امروز' },
  { id: '3', label: '۳ روز اخیر' },
  { id: '7', label: '۷ روز اخیر' },
  { id: '30', label: '۳۰ روز اخیر' },
  { id: '90', label: '۹۰ روز اخیر' }
]

export const DEFAULT_SMS_RANGE_DAYS = 7

/** Start of the range (local midnight): today counts as day 1, so 3 = today and the two days before. */
export function smsRangeStart(days: number, now: Date = new Date()): number {
  const start = new Date(now)

  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (Math.max(1, days) - 1))

  return start.getTime()
}
