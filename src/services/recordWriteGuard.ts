import { SMS_RECORD_NOTE } from './bankSmsNote'
import { SMS_TRANSFER_NOTE } from './bankSmsTransferRows'
import type { LedgerEntry } from './recordDuplicates'
import { loadRecordLedger } from './recordLedger'
import { isRecordLinked } from './recordLinks'
import { RECURRING_AUTO_NOTE, RECURRING_NOTE } from './recurring'
import type { AppSettings } from '../types'
import { diffIsoDays } from '../utils/jalaliDate'
import { normalizeDigits } from '../utils/normalizeDigits'
import { roundMoney } from '../utils/roundMoney'

/**
 * «قبلاً ثبت شده؟» — the one rule that decides whether a record about to be written is probably
 * already there. Manual entry, a bank SMS opened in the entry form and the recurring «ثبت همه»
 * list all ask this module; none of them keeps a rule of its own. It only finds and reports: it
 * never blocks, deletes or edits anything.
 */

/** Days the dates may differ (whole calendar days, so a month or year boundary needs no care). */
export const WRITE_GUARD_DAYS = 1

/** What is about to be written, reduced to what the rule compares. */
export interface WriteCandidate {
  type: LedgerEntry['type']
  amount: number
  /** `YYYY-MM-DD` */
  date: string
  accountId?: string
  category?: string
  title?: string
}

export interface WriteGuardOptions {
  /** Records that must not match (an earlier item of the same run took them). */
  excludeIds?: ReadonlySet<string>
  /** True for a record that is already part of something else (a debt payment, a check). */
  ignore?: (entry: LedgerEntry) => boolean
}

/** Where a record came from, read from the note the app writes. */
export type RecordSource = 'sms' | 'recurring' | 'manual'

export function recordSourceOf(entry: Pick<LedgerEntry, 'note'>): RecordSource {
  const note = (entry.note ?? '').trim()

  if (note === SMS_RECORD_NOTE) return 'sms'
  if (note === RECURRING_AUTO_NOTE || note.includes(RECURRING_NOTE)) return 'recurring'

  return 'manual'
}

const SOURCE_LABEL: Record<RecordSource, string> = {
  sms: 'پیامک',
  recurring: 'تکرار ماهانه',
  manual: 'دستی'
}

export function recordSourceLabel(entry: Pick<LedgerEntry, 'note'>): string {
  return SOURCE_LABEL[recordSourceOf(entry)]
}

function plain(text: string | undefined): string {
  return normalizeDigits(text ?? '')
    .replace(/[‌‏‎]/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Same title, or one holds the other («قهوه» in «قهوه با دوست»). Very short titles must be equal. */
function similarTitle(a: string | undefined, b: string | undefined): boolean {
  const left = plain(a)
  const right = plain(b)

  if (!left || !right) return false
  if (left === right) return true

  return Math.min(left.length, right.length) >= 3 && (left.includes(right) || right.includes(left))
}

/**
 * Similar enough to be the same purchase: the same category, or a similar title. A side that names
 * neither cannot be judged, and exact amount, account and day are then the evidence.
 */
function similarKind(candidate: WriteCandidate, entry: LedgerEntry): boolean {
  const candidateCategory = plain(candidate.category)
  const entryCategory = plain(entry.category)

  if (candidateCategory && candidateCategory === entryCategory) return true
  if (similarTitle(candidate.title, entry.title)) return true

  const candidateNamesNothing = !candidateCategory && !plain(candidate.title)
  const entryNamesNothing = !entryCategory && !plain(entry.title)

  return candidateNamesNothing || entryNamesNothing
}

function sameAccount(candidate: WriteCandidate, entry: LedgerEntry): boolean {
  const left = candidate.accountId ?? ''

  return !left || !entry.accountId || left === entry.accountId
}

function isMatch(candidate: WriteCandidate, entry: LedgerEntry): boolean {
  if (entry.type !== candidate.type) return false
  if (roundMoney(entry.amount) !== roundMoney(candidate.amount)) return false
  if (!entry.date || !candidate.date) return false
  if (Math.abs(diffIsoDays(entry.date, candidate.date)) > WRITE_GUARD_DAYS) return false
  // A transfer made from a bank SMS pair is not a purchase.
  if ((entry.note ?? '').trim() === SMS_TRANSFER_NOTE) return false

  return sameAccount(candidate, entry) && similarKind(candidate, entry)
}

/**
 * The record this one probably repeats: same direction, exact amount, same account (when both name
 * one), a date at most a day apart and a similar category or title. The nearest day wins, then the
 * same title, then the newest. `null` when nothing matches.
 */
export function findWriteDuplicate(
  candidate: WriteCandidate,
  ledger: readonly LedgerEntry[],
  { excludeIds, ignore }: WriteGuardOptions = {}
): LedgerEntry | null {
  if (!(candidate.amount > 0) || !candidate.date) return null

  const rank = (entry: LedgerEntry) =>
    Math.abs(diffIsoDays(entry.date, candidate.date)) * 10 +
    (similarTitle(candidate.title, entry.title) ? 0 : 1)
  let best: LedgerEntry | null = null

  for (const entry of ledger) {
    if (entry.id && excludeIds?.has(entry.id)) continue
    if (!isMatch(candidate, entry) || ignore?.(entry)) continue
    if (
      !best ||
      rank(entry) < rank(best) ||
      (rank(entry) === rank(best) && (entry.createdAtMs ?? 0) > (best.createdAtMs ?? 0))
    ) {
      best = entry
    }
  }

  return best
}

/**
 * The same rule on the open workbook's records (archives included), minus the records that are
 * already linked to a debt, receivable, check or installment. A read that fails answers `null`:
 * the guard may miss a duplicate but never stops a save.
 */
export async function findDuplicateBeforeWrite(
  settings: AppSettings,
  candidate: WriteCandidate
): Promise<LedgerEntry | null> {
  const ledger = await loadRecordLedger(settings, candidate.type).catch(() => [] as LedgerEntry[])

  return findWriteDuplicate(candidate, ledger, {
    ignore: entry => !!entry.id && isRecordLinked(settings.spreadsheetId, entry.id, entry.type)
  })
}
