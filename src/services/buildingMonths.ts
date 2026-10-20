import {
  daysInJalaliMonth,
  isoToJalali,
  JALALI_MONTHS,
  jalaliToIso,
  type DateRange
} from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'

/** Jalali month keys (`YYYY-MM`) of the charge months: the unit of «شارژ مهر ۱۴۰۵». */
export function monthKeyFor(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function partsOf(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number)

  return { year: year || 0, month: month || 1 }
}

export function previousMonthKey(monthKey: string): string {
  const { year, month } = partsOf(monthKey)

  return month === 1 ? monthKeyFor(year - 1, 12) : monthKeyFor(year, month - 1)
}

export function nextMonthKey(monthKey: string): string {
  const { year, month } = partsOf(monthKey)

  return month === 12 ? monthKeyFor(year + 1, 1) : monthKeyFor(year, month + 1)
}

/** «مهر». */
export function monthName(monthKey: string): string {
  return JALALI_MONTHS[partsOf(monthKey).month - 1] ?? ''
}

/** «مهر ۱۴۰۵». */
export function monthLabel(monthKey: string): string {
  return `${monthName(monthKey)} ${toPersianDigits(String(partsOf(monthKey).year))}`
}

/** The Jalali month key of an ISO date. */
export function monthKeyOfIso(iso: string): string {
  const { year, month } = isoToJalali(iso)

  return monthKeyFor(year, month)
}

/** The ISO date of `day` (1–28) in a Jalali month: the due date of that month's charge. */
export function dueDateOf(monthKey: string, day: number): string {
  const { year, month } = partsOf(monthKey)

  return jalaliToIso(year, month, Math.min(Math.max(day, 1), 28))
}

/** First to last day of a Jalali month, as ISO dates. */
export function monthRangeOf(monthKey: string): DateRange {
  const { year, month } = partsOf(monthKey)

  return {
    start: jalaliToIso(year, month, 1),
    end: jalaliToIso(year, month, daysInJalaliMonth(year, month))
  }
}

/** `count` month keys ending at `monthKey`, oldest first. */
export function recentMonthKeys(monthKey: string, count: number): string[] {
  const keys = [monthKey]

  while (keys.length < count) keys.unshift(previousMonthKey(keys[0]))

  return keys
}
