import { daysInJalaliMonth, getTodayIso, isoToJalali, JALALI_MONTHS, toIsoDate } from './jalaliDate'
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

function getIntlParts(date: Date, calendar: CalendarSystem): CalendarDateParts {
  const parts = new Intl.DateTimeFormat(`en-u-ca-${CALENDAR_IDS[calendar]}`, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(date)

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

function findGregorianForCalendar(
  year: number,
  month: number,
  day: number,
  calendar: CalendarSystem
): Date {
  const approxYear = calendar === 'hijri' ? year + 579 : calendar === 'shamsi' ? year + 621 : year

  for (let y = approxYear - 2; y <= approxYear + 2; y++) {
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= 31; d++) {
        const date = new Date(y, m, d)

        const parts = getCalendarParts(toIsoDate(date), calendar)

        if (parts.year === year && parts.month === month && parts.day === day) {
          return date
        }
      }
    }
  }

  return new Date()
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

export function getCalendarMonthNames(calendar: CalendarSystem): string[] {
  if (calendar === 'shamsi') {
    return [...JALALI_MONTHS]
  }

  const refYear =
    calendar === 'hijri'
      ? getCalendarParts(getTodayIso(), 'hijri').year
      : getCalendarParts(getTodayIso(), 'miladi').year

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1

    const iso = partsToIso({ year: refYear, month, day: 1 }, calendar)

    return parseIso(iso).toLocaleDateString('fa-IR', {
      calendar: CALENDAR_IDS[calendar],
      month: 'long'
    })
  })
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
  return parseIso(iso).toLocaleDateString('fa-IR', {
    calendar: CALENDAR_IDS[calendar],
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatCalendarDateCompact(iso: string, calendar: CalendarSystem): string {
  return parseIso(iso).toLocaleDateString('fa-IR', {
    calendar: CALENDAR_IDS[calendar],
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

  const weekday = parseIso(iso).toLocaleDateString('fa-IR', {
    calendar: CALENDAR_IDS[calendar],
    weekday: 'long'
  })

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
