import { formatDateRangeLabel, formatJalaliYear, type DateRange } from './dateRange'
import { formatPersianNumber } from './formatMoney'
import { daysInJalaliMonth, getJalaliParts, isoToJalali, JALALI_MONTHS } from './jalaliDate'
import { normalizeSheetDate } from './sheetValues'

export type PeriodKind = 'month' | 'year' | 'range'

export interface PeriodDescription {
  kind: PeriodKind
  /** «مهر ۱۴۰۵», «۱۴۰۵» or the full range. */
  label: string
  /** Word for the period in labels such as «درآمد ماه»: ماه / سال / دوره. */
  noun: string
}

export function formatJalaliMonthName(year: number, month: number): string {
  return `${JALALI_MONTHS[month - 1] ?? ''} ${formatJalaliYear(year)}`
}

/**
 * Names a dashboard period the way a person would: a range that starts on the
 * 1st of a Jalali month and stays inside it (up to today or its last day) is
 * that month; one that starts on 1 Farvardin and stays in the year is the year.
 */
export function describePeriod(range: DateRange, todayIso: string): PeriodDescription {
  const start = isoToJalali(range.start)
  const end = isoToJalali(range.end)
  const endsToday = range.end.slice(0, 10) === todayIso.slice(0, 10)

  if (start.day === 1 && start.year === end.year && start.month === end.month) {
    if (endsToday || end.day === daysInJalaliMonth(end.year, end.month)) {
      return { kind: 'month', label: formatJalaliMonthName(start.year, start.month), noun: 'ماه' }
    }
  }

  if (start.day === 1 && start.month === 1 && start.year === end.year) {
    if (endsToday || (end.month === 12 && end.day === daysInJalaliMonth(end.year, 12))) {
      return { kind: 'year', label: formatJalaliYear(start.year), noun: 'سال' }
    }
  }

  return { kind: 'range', label: formatDateRangeLabel(range), noun: 'دوره' }
}

const weekdayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' })

/** «۲۰ مهر، سه‌شنبه». */
export function formatTodayLabel(date: Date = new Date()): string {
  const { day, month } = getJalaliParts(date)

  return `${formatPersianNumber(day)} ${JALALI_MONTHS[month - 1]}، ${weekdayFormatter.format(date)}`
}

/** Day and month name for a date badge: { day: '۱۵', month: 'مهر' }; accepts raw sheet dates. */
export function formatDayBadge(date: string): { day: string; month: string } {
  const { day, month } = isoToJalali(normalizeSheetDate(date) || date)

  return { day: formatPersianNumber(day), month: JALALI_MONTHS[month - 1] ?? '' }
}
