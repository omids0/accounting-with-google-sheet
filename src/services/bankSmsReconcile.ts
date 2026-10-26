import { isConfirmable, type ConfirmableSms, type ReviewedSms } from './bankSmsQueue'
import {
  isReconcileCorrection,
  matchSmsToRecords,
  NO_RECONCILE_LINKS,
  RECONCILE_NOTE_PREFIX,
  type ReconcileLinks,
  type SmsRecordMatch
} from './bankSmsReconcileMatch'
import type { LedgerEntry } from './recordDuplicates'
import { numberLocale } from '../utils/digitStyle'
import { formatAmountWords } from '../utils/insightText'
import { getJalaliParts, JALALI_MONTHS, toIsoDate } from '../utils/jalaliDate'
import { SMS_RECONCILE_CATEGORY } from '../utils/protectedCategories'
import { roundMoney } from '../utils/roundMoney'

/**
 * Balance reconciliation with bank SMS (round 7, Task A). Pure rules only:
 * the account's newest SMS «مانده» against the app balance at that SMS's moment.
 */

/** The wizard's first range, before any successful reconciliation. */
export const FIRST_RECONCILE_DAYS = 90

const DAY_MS = 24 * 60 * 60 * 1000

/** One account in `accounting_reconcile_v1`: the last success and the ignored difference. */
export interface ReconcileEntry {
  /** ISO time of the last successful reconciliation. */
  at?: string
  /** SMS «مانده» it agreed with. */
  balance?: number
  /** `receivedAt` of that SMS; the next range starts here. */
  smsAt?: number
  /** «نادیده»: this exact difference stays hidden until it changes. */
  ignored?: number
}

export { isReconcileCorrection, matchSmsToRecords, RECONCILE_NOTE_PREFIX }
export type { ReconcileLinks, SmsRecordMatch }

export interface AccountReconcile {
  smsAt: number
  smsBalance: number
  /** The app balance at `smsAt`. */
  appBalance: number
  /** App minus bank: positive = more in the app. */
  difference: number
  match: SmsRecordMatch
}

/** Recognised SMS of one account, oldest first. */
export function accountSms(entries: ReviewedSms[], accountId: string): ConfirmableSms[] {
  return entries
    .filter(isConfirmable)
    .filter(entry => entry.result.accountId === accountId)
    .sort((a, b) => a.sms.receivedAt - b.sms.receivedAt)
}

/**
 * Did this record's money move after `smsAt`? A matched record moved with its SMS; a
 * correction record belongs before any SMS; otherwise its date decides, and on the
 * SMS's own day its «زمان ثبت» (when entered that day).
 */
export function isAfterSms(record: LedgerEntry, smsAt: number, matchedAt?: number): boolean {
  if (isReconcileCorrection(record)) return false
  if (matchedAt !== undefined) return matchedAt > smsAt
  if (!record.date) return false

  const smsDay = toIsoDate(new Date(smsAt))

  if (record.date !== smsDay) return record.date > smsDay

  const created = record.createdAtMs

  return typeof created === 'number' && toIsoDate(new Date(created)) === smsDay && created > smsAt
}

/** Account balance minus the net of its records that moved it after `smsAt`. */
export function appBalanceAt(
  balance: number,
  records: LedgerEntry[],
  accountId: string,
  smsAt: number,
  smsTimeOf: Map<LedgerEntry, number> = new Map()
): number {
  return records.reduce((total, record) => {
    if (record.accountId !== accountId || record.moved === false) return total
    if (!isAfterSms(record, smsAt, smsTimeOf.get(record))) return total

    return roundMoney(total - (record.type === 'expense' ? -record.amount : record.amount))
  }, balance)
}

/** `null` when the account has no recognised SMS with a «مانده». */
export function reconcileAccount(
  accountId: string,
  balance: number,
  sms: ConfirmableSms[],
  records: LedgerEntry[],
  links: ReconcileLinks = NO_RECONCILE_LINKS
): AccountReconcile | null {
  const newest = sms
    .filter(entry => entry.balance !== null && entry.result.accountId === accountId)
    .reduce<ConfirmableSms | null>(
      (best, entry) => (!best || entry.sms.receivedAt > best.sms.receivedAt ? entry : best),
      null
    )

  if (!newest || newest.balance === null) return null

  const match = matchSmsToRecords(sms, records, accountId, links)
  const smsAt = newest.sms.receivedAt
  const appBalance = appBalanceAt(balance, records, accountId, smsAt, match.smsTimeOf)
  const raw = roundMoney(appBalance - newest.balance)

  // Rial SMS in a toman app can leave half units behind.
  return {
    smsAt,
    smsBalance: newest.balance,
    appBalance,
    difference: Math.abs(raw) < 1 ? 0 : raw,
    match
  }
}

export function isDifferenceIgnored(entry: ReconcileEntry | undefined, difference: number) {
  return (
    difference !== 0 &&
    entry?.ignored !== undefined &&
    roundMoney(entry.ignored) === roundMoney(difference)
  )
}

/** The red block shows only for a real, not-ignored difference. */
export function shouldShowDifference(
  result: AccountReconcile | null,
  entry: ReconcileEntry | undefined
): boolean {
  return !!result && result.difference !== 0 && !isDifferenceIgnored(entry, result.difference)
}

/** «۸ مهر» */
export function smsDayLabel(ms: number): string {
  const { month, day } = getJalaliParts(new Date(ms))

  return `${day.toLocaleString(numberLocale())} ${JALALI_MONTHS[month - 1]}`
}

/** «۸ مهر ۱۴:۰۲» */
export function smsMomentLabel(ms: number): string {
  const time = new Date(ms).toLocaleTimeString(numberLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })

  return `${smsDayLabel(ms)} ${time}`
}

export interface CorrectionOptions {
  /** The category the user picked (e.g. «کارمزد»); empty = the system «تطبیق». */
  category?: string
  /** Free text appended to the note («کارمزد جابجایی»). */
  note?: string
}

/**
 * The record that closes the difference (never a direct balance edit): more in the
 * app → an expense, less → an income, dated on the SMS day.
 */
export function correctionRecord(
  difference: number,
  smsAt: number,
  { category, note }: CorrectionOptions = {}
) {
  const chosen = category?.trim() || SMS_RECONCILE_CATEGORY
  const extra = note?.trim()
  const base = `${RECONCILE_NOTE_PREFIX} ${smsDayLabel(smsAt)}`

  return {
    type: difference > 0 ? ('expense' as const) : ('income' as const),
    title: chosen,
    amount: roundMoney(Math.abs(difference)),
    category: chosen,
    note: extra ? `${base} · ${extra}` : base,
    date: toIsoDate(new Date(smsAt))
  }
}

/** The wizard starts at the SMS of the last success, else 90 days back. */
export function reconcileRangeStart(entry: ReconcileEntry | undefined, nowMs: number): number {
  return entry?.smsAt ?? nowMs - FIRST_RECONCILE_DAYS * DAY_MS
}

/** Nightly digest: «ملت ۳۵۰ هزار اختلاف دارد». */
export function reconcileDigestLine(accountTitle: string, difference: number): string {
  return `${accountTitle} ${formatAmountWords(difference)} اختلاف دارد`
}

/** Digest line per account with a real, not-ignored difference (cash filtered by the caller). */
export function buildDigestLines(
  accounts: { id: string; title: string; balance: number }[],
  reviewed: ReviewedSms[],
  ledger: LedgerEntry[],
  entries: Record<string, ReconcileEntry>,
  links: ReconcileLinks = NO_RECONCILE_LINKS
): Record<string, string> {
  const lines: Record<string, string> = {}

  for (const account of accounts) {
    const sms = accountSms(reviewed, account.id)
    const result = reconcileAccount(account.id, account.balance, sms, ledger, links)

    if (result && shouldShowDifference(result, entries[account.id])) {
      lines[account.id] = reconcileDigestLine(account.title, result.difference)
    }
  }

  return lines
}

/** Today's digest lines per account, built once per day. */
export interface ReconcileDigestGate {
  date: string
  lines: Record<string, string>
}

/** The lines already built today, or `null` when today's have not been built yet. */
export function todaysDigestLines(
  gate: ReconcileDigestGate | undefined,
  todayIso: string
): string[] | null {
  return gate?.date === todayIso ? Object.values(gate.lines) : null
}

/** After a reconciliation or «نادیده», the account leaves today's lines. */
export function withoutDigestLine(
  gate: ReconcileDigestGate | undefined,
  accountId: string
): ReconcileDigestGate | undefined {
  if (!gate?.lines[accountId]) return gate

  const lines = { ...gate.lines }

  delete lines[accountId]

  return { ...gate, lines }
}
