import { daysInJalaliMonth, jalaliToIso } from '../utils/jalaliDate'
import { normalizeDigits } from '../utils/normalizeDigits'
import { normalizeSheetDate } from '../utils/sheetValues'

/** Jalali years below this are read as Jalali, from it on as Gregorian (as in `normalizeSheetDate`). */
const GREGORIAN_FROM = 1900

const JALALI_YEARS = { min: 1250, max: 1600 }

const GREGORIAN_YEARS = { min: 1900, max: 2200 }

/** A Sheets serial under this is a stray small number («12»), not a date. */
const MIN_SERIAL = 20000

const DATE_TIME_PATTERN =
  /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z?)?$/

const pad = (value: number) => String(value).padStart(2, '0')

function ymdToIso(year: number, month: number, day: number): string {
  if (month < 1 || month > 12 || day < 1) return ''

  if (year < GREGORIAN_FROM) {
    if (year < JALALI_YEARS.min || year > JALALI_YEARS.max) return ''
    if (day > daysInJalaliMonth(year, month)) return ''

    return jalaliToIso(year, month, day)
  }

  if (year < GREGORIAN_YEARS.min || year > GREGORIAN_YEARS.max) return ''

  const date = new Date(Date.UTC(year, month - 1, day))

  // 2026-02-30 must not roll over into March.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''

  return `${year}-${pad(month)}-${pad(day)}`
}

/** ISO sanity for what `normalizeSheetDate` hands back for a serial number. */
function isSaneIso(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)

  return Boolean(match) && ymdToIso(Number(match![1]), Number(match![2]), Number(match![3])) === iso
}

/**
 * An imported date cell as ISO `YYYY-MM-DD`, or `''` when it is empty or not a real date.
 * Reads ISO, Jalali with `/` or `-` and any digits («۱۴۰۵/۰۸/۰۲», «۱۴۰۵-۸-۲», «1405-08-02»),
 * a trailing time (dropped) and a Sheets serial number. A day the month does not have is invalid.
 */
export function parseImportDate(raw: string | undefined): string {
  const text = normalizeDigits(String(raw ?? '').trim())

  if (!text) return ''

  const match = DATE_TIME_PATTERN.exec(text)

  if (match) return ymdToIso(Number(match[1]), Number(match[2]), Number(match[3]))

  if (!/^\d+(\.\d+)?$/.test(text) || Number(text) < MIN_SERIAL) return ''

  const iso = normalizeSheetDate(text)

  return isSaneIso(iso) ? iso : ''
}

/**
 * An imported date-time cell as `YYYY-MM-DDTHH:mm:ss` (the way the timesheets keep it), or `''`.
 * A date alone is midnight; the hour must be 0–23 and the minute and second 0–59.
 */
export function parseImportDateTime(raw: string | undefined): string {
  const match = DATE_TIME_PATTERN.exec(normalizeDigits(String(raw ?? '').trim()))

  if (!match) return ''

  const date = ymdToIso(Number(match[1]), Number(match[2]), Number(match[3]))

  const [hour, minute, second] = [match[4], match[5], match[6]].map(part => Number(part ?? 0))

  if (!date || hour > 23 || minute > 59 || second > 59) return ''

  return `${date}T${pad(hour)}:${pad(minute)}:${pad(second)}`
}
