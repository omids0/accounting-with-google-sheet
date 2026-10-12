import { jalaliToDate } from '../utils/jalaliConvert'
import { diffIsoDays } from '../utils/jalaliDate'
import { normalizeDigits } from '../utils/normalizeDigits'

/**
 * Duplicate detection shared by the bank SMS queue and the entry form (round 6, A3).
 * Deterministic only: same direction and amount on (nearly) the same day, plus the
 * stricter rules the entry form adds (same category, created in the last hour).
 */

/** An existing income/expense record, reduced to what duplicate detection needs. */
export interface LedgerEntry {
  type: 'income' | 'expense'
  amount: number
  /** `YYYY-MM-DD` */
  date: string
  /** Wallet account the record names ('' when none). */
  accountId: string
  id?: string
  category?: string
  /** «زمان ثبت» as epoch ms; `null` when the cell cannot be read. */
  createdAtMs?: number | null
}

export interface DuplicateCandidate {
  type: LedgerEntry['type']
  amount: number
  /** `YYYY-MM-DD` */
  date: string
  category?: string
}

export interface DuplicateRule {
  /** Whole days the dates may differ (bank SMS: 1, entry form: 0). */
  dayTolerance: number
  /** The entry form also requires the same category. */
  sameCategory?: boolean
  /** Only records created within this window before `nowMs` count. */
  createdWithinMs?: number
  nowMs?: number
}

/** The entry form warns about a record created at most this long ago. */
export const ENTRY_DUPLICATE_WINDOW_MS = 60 * 60 * 1000

/**
 * Epoch ms of a «زمان ثبت» cell: `toLocaleString('fa-IR')` («۱۴۰۵/۷/۲۰, ۱۴:۰۲:۳۳»),
 * a Gregorian `YYYY/MM/DD hh:mm` or an ISO timestamp. `null` without a time of day.
 */
export function parseCreatedAtMs(text: string): number | null {
  const value = normalizeDigits(String(text ?? '')).trim()

  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = Date.parse(value)

    return Number.isNaN(parsed) ? null : parsed
  }

  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\D+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/.exec(
    value
  )

  if (!match) return null

  const [year, month, day, hour, minute, second] = match.slice(1).map(part => Number(part ?? 0))
  const date = year < 1700 ? jalaliToDate(year, month, day) : new Date(year, month - 1, day)

  date.setHours(hour, minute, second || 0, 0)

  return date.getTime()
}

export function matchesDuplicate(
  candidate: DuplicateCandidate,
  entry: LedgerEntry,
  rule: DuplicateRule
): boolean {
  if (entry.type !== candidate.type || entry.amount !== candidate.amount) return false
  if (!candidate.date || !entry.date) return false
  if (Math.abs(diffIsoDays(entry.date, candidate.date)) > rule.dayTolerance) return false
  if (rule.sameCategory && (entry.category ?? '') !== (candidate.category ?? '')) return false
  if (rule.createdWithinMs === undefined) return true

  const created = entry.createdAtMs
  const now = rule.nowMs ?? Date.now()

  return typeof created === 'number' && created <= now && now - created <= rule.createdWithinMs
}

/**
 * The entry form's warning: same amount, category and date as a record created in the
 * last 60 minutes. Returns the newest such record, or `null`.
 */
export function findRecentEntryDuplicate(
  candidate: DuplicateCandidate,
  ledger: LedgerEntry[],
  nowMs: number
): LedgerEntry | null {
  if (!(candidate.amount > 0) || !candidate.category) return null

  const rule: DuplicateRule = {
    dayTolerance: 0,
    sameCategory: true,
    createdWithinMs: ENTRY_DUPLICATE_WINDOW_MS,
    nowMs
  }

  return (
    ledger
      .filter(entry => matchesDuplicate(candidate, entry, rule))
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))[0] ?? null
  )
}

/** «۱۲ دقیقه پیش» / «همین الان» for the warning card. */
export function createdAgoLabel(createdAtMs: number, nowMs: number): string {
  const minutes = Math.floor((nowMs - createdAtMs) / 60_000)

  return minutes < 1 ? 'همین الان' : `${minutes.toLocaleString('fa-IR')} دقیقه پیش`
}
