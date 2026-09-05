import { jalaliToDate, jdnToGregorian } from './jalaliConvert'
import { daysInJalaliMonth, getTodayIso, isoToJalali, JALALI_MONTHS, toIsoDate } from './jalaliDate'
import { memoizeByKey } from './memoize'
import { numberToPersianWords } from './numberToWords'

export type CalendarSystem = 'shamsi' | 'miladi' | 'hijri'

export const CALENDAR_SYSTEM_OPTIONS: { value: CalendarSystem; label: string }[] = [
  { value: 'shamsi', label: 'شمسی (جلالی)' },
  { value: 'miladi', label: 'میلادی' },
  { value: 'hijri', label: 'قمری (هجری)' }
]

export const CALENDAR_SHORT_LABELS: Record<CalendarSystem, string> = {
  shamsi: 'شمسی',
  miladi: 'میلادی',
  hijri: 'قمری'
}

export interface CalendarDateParts {
  year: number
  month: number
  day: number
}

const CALENDAR_IDS: Record<CalendarSystem, string> = {
  shamsi: 'persian',
  miladi: 'gregory',
  hijri: 'islamic'
}

function parseIso(iso: string): Date {
  return new Date(`${(iso || getTodayIso()).slice(0, 10)}T12:00:00`)
}

const partsFormatters = new Map<CalendarSystem, Intl.DateTimeFormat>()

/** Reuse one formatter per calendar; constructing them is the expensive part. */
function getPartsFormatter(calendar: CalendarSystem): Intl.DateTimeFormat {
  const cached = partsFormatters.get(calendar)

  if (cached) return cached

  const formatter = new Intl.DateTimeFormat(`en-u-ca-${CALENDAR_IDS[calendar]}`, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })

  partsFormatters.set(calendar, formatter)

  return formatter
}

function getIntlParts(date: Date, calendar: CalendarSystem): CalendarDateParts {
  const parts = getPartsFormatter(calendar).formatToParts(date)

  const get = (type: string) => Number(parts.find(part => part.type === type)?.value ?? 0)

  return { year: get('year'), month: get('month'), day: get('day') }
}

export function getCalendarLabel(calendar: CalendarSystem): string {
  return CALENDAR_SYSTEM_OPTIONS.find(option => option.value === calendar)?.label ?? calendar
}

export function getCalendarParts(iso: string, calendar: CalendarSystem): CalendarDateParts {
  if (calendar === 'shamsi') {
    return isoToJalali(iso)
  }

  return getIntlParts(parseIso(iso), calendar)
}

/** 1 Muharram 1 AH and the mean lengths used to seed the Hijri search. */
const HIJRI_EPOCH_JDN = 1948440
const HIJRI_YEAR_DAYS = 354.36707
const HIJRI_MONTH_DAYS = 29.530589
const HIJRI_SEARCH_WINDOW_DAYS = 45

/**
 * The Hijri calendar has no closed-form conversion here, so estimate the day
 * number from mean year/month lengths and scan a small window around it. This
 * replaces a scan of five full Gregorian years (~1,800 probes) with ~90.
 */
function findGregorianForHijri(year: number, month: number, day: number): Date {
  const estimatedJdn = Math.round(
    HIJRI_EPOCH_JDN + (year - 1) * HIJRI_YEAR_DAYS + (month - 1) * HIJRI_MONTH_DAYS + (day - 1)
  )

  for (let offset = 0; offset <= HIJRI_SEARCH_WINDOW_DAYS; offset++) {
    for (const signedOffset of offset === 0 ? [0] : [offset, -offset]) {
      const { gy, gm, gd } = jdnToGregorian(estimatedJdn + signedOffset)

      const date = new Date(gy, gm - 1, gd, 12, 0, 0, 0)

      const parts = getIntlParts(date, 'hijri')

      if (parts.year === year && parts.month === month && parts.day === day) {
        return date
      }
    }
  }

  return new Date()
}

function findGregorianForCalendar(
  year: number,
  month: number,
  day: number,
  calendar: CalendarSystem
): Date {
  if (calendar === 'shamsi') {
    return jalaliToDate(year, month, day)
  }

  if (calendar === 'hijri') {
    return findGregorianForHijri(year, month, day)
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

export function partsToIso(parts: CalendarDateParts, calendar: CalendarSystem): string {
  if (calendar === 'miladi') {
    return toIsoDate(new Date(parts.year, parts.month - 1, parts.day))
  }

  return toIsoDate(findGregorianForCalendar(parts.year, parts.month, parts.day, calendar))
}

export function daysInCalendarMonth(year: number, month: number, calendar: CalendarSystem): number {
  if (calendar === 'shamsi') {
    return daysInJalaliMonth(year, month)
  }

  for (let day = 31; day >= 28; day--) {
    const iso = partsToIso({ year, month, day }, calendar)

    const parts = getCalendarParts(iso, calendar)

    if (parts.year === year && parts.month === month && parts.day === day) {
      return day
    }
  }

  return 30
}

const displayFormatters = new Map<string, Intl.DateTimeFormat>()

/** `toLocaleDateString` rebuilds a formatter per call; keep one per option set. */
function formatFa(
  date: Date,
  calendar: CalendarSystem,
  options: Intl.DateTimeFormatOptions
): string {
  const key = `${calendar}|${Object.keys(options).join(',')}`

  let formatter = displayFormatters.get(key)

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('fa-IR', { calendar: CALENDAR_IDS[calendar], ...options })
    displayFormatters.set(key, formatter)
  }

  return formatter.format(date)
}

const computeMonthNames = memoizeByKey(
  (calendar: CalendarSystem): string[] => {
    const refYear = getCalendarParts(getTodayIso(), calendar).year

    return Array.from({ length: 12 }, (_, index) => {
      const iso = partsToIso({ year: refYear, month: index + 1, day: 1 }, calendar)

      return formatFa(parseIso(iso), calendar, { month: 'long' })
    })
  },
  calendar => calendar
)

export function getCalendarMonthNames(calendar: CalendarSystem): string[] {
  if (calendar === 'shamsi') {
    return [...JALALI_MONTHS]
  }

  return [...computeMonthNames(calendar)]
}

export function getCalendarMonthWheelItems(
  calendar: CalendarSystem
): { value: string; label: string }[] {
  return getCalendarMonthNames(calendar).map((name, index) => {
    const monthNumber = index + 1

    const monthLabel = monthNumber.toLocaleString('fa-IR', { useGrouping: false })

    return {
      value: String(monthNumber),
      label: `${name}(${monthLabel})`
    }
  })
}

export function getCalendarYearRange(calendar: CalendarSystem, centerIso?: string): number[] {
  const { year } = getCalendarParts(centerIso || getTodayIso(), calendar)

  return Array.from({ length: 21 }, (_, index) => year - 10 + index)
}

export function formatCalendarDate(iso: string, calendar: CalendarSystem): string {
  return formatFa(parseIso(iso), calendar, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatCalendarDateCompact(iso: string, calendar: CalendarSystem): string {
  return formatFa(parseIso(iso), calendar, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function toPersianDigits(value: string | number, pad = 0): string {
  const raw = pad > 0 ? String(value).padStart(pad, '0') : String(value)

  return raw.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

function getCalendarMonthName(calendar: CalendarSystem, month: number): string {
  if (calendar === 'shamsi') {
    return JALALI_MONTHS[month - 1] ?? ''
  }

  return getCalendarMonthNames(calendar)[month - 1] ?? ''
}

export function formatCalendarDateNumeric(iso: string, calendar: CalendarSystem): string {
  const { year, month, day } = getCalendarParts(iso, calendar)

  return `${toPersianDigits(year)}/${toPersianDigits(month, 2)}/${toPersianDigits(day, 2)}`
}

export function formatCalendarDateWords(iso: string, calendar: CalendarSystem): string {
  const { year, month, day } = getCalendarParts(iso, calendar)

  const weekday = formatFa(parseIso(iso), calendar, { weekday: 'long' })

  const monthName = getCalendarMonthName(calendar, month)

  return `${weekday}، ${numberToPersianWords(day)} ${monthName} ${numberToPersianWords(year)}`
}

export interface CalendarConversionDisplay {
  numeric: string
  words: string
}

export function getCalendarConversionDisplay(
  iso: string,
  calendar: CalendarSystem
): CalendarConversionDisplay {
  const safeIso = iso || getTodayIso()

  return {
    numeric: formatCalendarDateNumeric(safeIso, calendar),
    words: formatCalendarDateWords(safeIso, calendar)
  }
}

export function getCalendarConversions(iso: string): Record<CalendarSystem, string> {
  const safeIso = iso || getTodayIso()

  return {
    shamsi: formatCalendarDate(safeIso, 'shamsi'),
    miladi: formatCalendarDate(safeIso, 'miladi'),
    hijri: formatCalendarDate(safeIso, 'hijri')
  }
}
