import { getJalaliMonthRange } from './dateRange'
import { addDaysToIso, addJalaliMonths, isoToJalali } from './jalaliDate'

/** Saturday-first week header: «ش ی د س چ پ ج», with full names for screen readers. */
export const JALALI_WEEKDAYS: { short: string; name: string }[] = [
  { short: 'ش', name: 'شنبه' },
  { short: 'ی', name: 'یکشنبه' },
  { short: 'د', name: 'دوشنبه' },
  { short: 'س', name: 'سه‌شنبه' },
  { short: 'چ', name: 'چهارشنبه' },
  { short: 'پ', name: 'پنجشنبه' },
  { short: 'ج', name: 'جمعه' }
]

/** Column of a date in a Saturday-first week: 0 = شنبه … 6 = جمعه. */
export function saturdayFirstColumn(iso: string): number {
  return (new Date(`${iso.slice(0, 10)}T12:00:00`).getDay() + 1) % 7
}

/**
 * The weeks of a Jalali month (`YYYY-MM`) as rows of seven ISO dates, Saturday
 * first; `null` pads the days before the 1st and after the last day.
 */
export function buildJalaliMonthGrid(monthKey: string): (string | null)[][] {
  const range = getJalaliMonthRange(monthKey)

  if (!range) return []

  const cells: (string | null)[] = Array.from(
    { length: saturdayFirstColumn(range.start) },
    () => null
  )

  for (let day = range.start; day <= range.end; day = addDaysToIso(day, 1)) {
    cells.push(day)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (string | null)[][] = []

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }

  return weeks
}

/**
 * The day a key moves to from `iso` in a month grid, or null when the key does
 * not navigate. Arrows follow the screen: in RTL the next day is on the left,
 * so ← moves forward. ↑↓ move a week, Home/End to the week's first/last day,
 * PageUp/PageDown to the same day of the previous/next month.
 */
export function nextGridDayForKey(iso: string, key: string, rtl: boolean): string | null {
  const day = iso.slice(0, 10)
  const column = saturdayFirstColumn(day)

  switch (key) {
    case 'ArrowUp':
      return addDaysToIso(day, -7)
    case 'ArrowDown':
      return addDaysToIso(day, 7)
    case 'ArrowLeft':
      return addDaysToIso(day, rtl ? 1 : -1)
    case 'ArrowRight':
      return addDaysToIso(day, rtl ? -1 : 1)
    case 'Home':
      return addDaysToIso(day, -column)
    case 'End':
      return addDaysToIso(day, 6 - column)
    case 'PageUp':
      return addJalaliMonths(day, -1, isoToJalali(day).day)
    case 'PageDown':
      return addJalaliMonths(day, 1, isoToJalali(day).day)
    default:
      return null
  }
}
