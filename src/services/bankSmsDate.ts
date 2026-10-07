import { normalizeSmsText } from './bankSmsText'
import { jalaliToIso, toIsoDate } from '../utils/jalaliDate'

/** A date printed in the SMS further than this from its arrival is not trusted. */
const MAX_DRIFT_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

const DATE_PATTERN = /(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})/g

function isoDay(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)

  return Date.UTC(year, month - 1, day)
}

/** `1405/07/15` or `05/07/15` (Jalali, two-digit years in the 1400s). */
function jalaliToIsoSafe(rawYear: string, rawMonth: string, rawDay: string): string | null {
  const year = rawYear.length === 2 ? 1400 + Number(rawYear) : Number(rawYear)
  const month = Number(rawMonth)
  const day = Number(rawDay)

  if (year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1 || day > 31) return null

  return jalaliToIso(year, month, day)
}

/**
 * Record date for an SMS (`YYYY-MM-DD`): the Jalali date printed in its text when
 * there is a plausible one, otherwise the day the phone received it.
 */
export function smsRecordDate(body: string, receivedAt: number): string {
  const received = toIsoDate(new Date(receivedAt))

  for (const match of normalizeSmsText(body).matchAll(DATE_PATTERN)) {
    const iso = jalaliToIsoSafe(match[1], match[2], match[3])

    if (iso && Math.abs(isoDay(iso) - isoDay(received)) <= MAX_DRIFT_DAYS * DAY_MS) return iso
  }

  return received
}
