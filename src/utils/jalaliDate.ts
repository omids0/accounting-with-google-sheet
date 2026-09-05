import { dateToJalali, jalaliMonthLength, jalaliToDate, type JalaliParts } from './jalaliConvert'
import { memoizeByKey } from './memoize'

export type { JalaliParts }

export interface DateRange {
  start: string
  end: string
}

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
]

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()

  const m = String(d.getMonth() + 1).padStart(2, '0')

  const day = String(d.getDate()).padStart(2, '0')

  return `${y}-${m}-${day}`
}

export function getJalaliParts(d: Date): JalaliParts {
  if (Number.isNaN(d.getTime())) {
    return dateToJalali(new Date())
  }

  return dateToJalali(d)
}

export function findGregorianForJalali(jy: number, jm: number, jd: number): Date {
  return jalaliToDate(jy, jm, jd)
}

export function daysInJalaliMonth(jy: number, jm: number): number {
  return jalaliMonthLength(jy, jm)
}

const isoDateToJalali = memoizeByKey(
  (dateOnly: string): JalaliParts => dateToJalali(new Date(`${dateOnly}T12:00:00`)),
  dateOnly => dateOnly
)

export function isoToJalali(iso: string): JalaliParts {
  const dateOnly = iso.slice(0, 10)

  // Only calendar dates are cached; the "today" fallbacks below must stay live
  // so a session that spans midnight does not keep reporting yesterday.
  if (ISO_DATE_PATTERN.test(dateOnly)) return isoDateToJalali(dateOnly)

  if (iso) {
    const parsed = new Date(iso)

    if (!Number.isNaN(parsed.getTime())) return dateToJalali(parsed)
  }

  return dateToJalali(new Date())
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  return toIsoDate(jalaliToDate(jy, jm, jd))
}

export function getTodayIso(): string {
  return toIsoDate(new Date())
}

export function addDaysToIso(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)

  d.setDate(d.getDate() + days)

  return toIsoDate(d)
}

/**
 * Reused across every list row; constructing `Intl.DateTimeFormat` per call was
 * measurably the most expensive thing in list rendering.
 */
const persianDateFormatter = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  year: 'numeric',
  month: 'short',
  day: 'numeric'
})

export const formatIsoDatePersian = memoizeByKey(
  (iso: string): string => {
    if (!iso) return '—'

    const d = iso.slice(0, 10)

    if (!ISO_DATE_PATTERN.test(d)) return iso

    return persianDateFormatter.format(new Date(`${d}T12:00:00`))
  },
  iso => iso
)

function computeJalaliMonthsAhead(baseIso: string, monthsToAdd: number, day: number): string {
  const { year, month } = isoToJalali(baseIso)

  const absoluteMonth = month - 1 + monthsToAdd

  const jy = year + Math.floor(absoluteMonth / 12)

  const jm = (((absoluteMonth % 12) + 12) % 12) + 1

  const maxDay = daysInJalaliMonth(jy, jm)

  return jalaliToIso(jy, jm, Math.min(day, maxDay))
}

const memoizedJalaliMonthsAhead = memoizeByKey(
  computeJalaliMonthsAhead,
  (baseIso, monthsToAdd, day) => `${baseIso}|${monthsToAdd}|${day}`
)

export function addJalaliMonths(baseIso: string, monthsToAdd: number, day: number): string {
  // Same reasoning as `isoToJalali`: results relative to "today" stay uncached.
  if (!ISO_DATE_PATTERN.test(baseIso.slice(0, 10))) {
    return computeJalaliMonthsAhead(baseIso, monthsToAdd, day)
  }

  return memoizedJalaliMonthsAhead(baseIso, monthsToAdd, day)
}
