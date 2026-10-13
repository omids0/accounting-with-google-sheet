import { smsRecordDate } from './bankSmsDate'
import { isConfirmable, type ConfirmableSms, type ReviewedSms } from './bankSmsQueue'
import { matchesDuplicate, type LedgerEntry } from './recordDuplicates'
import { numberLocale } from '../utils/digitStyle'
import { formatAmountWords } from '../utils/insightText'
import { getJalaliParts, JALALI_MONTHS, toIsoDate } from '../utils/jalaliDate'
import { SMS_RECONCILE_CATEGORY } from '../utils/protectedCategories'

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

export interface SmsRecordMatch {
  /** Each matched record, with the `receivedAt` of its SMS. */
  smsTimeOf: Map<LedgerEntry, number>
  /** SMS of this account with no record («پیامک‌هایی که در اپ نیستند»). */
  missingSms: ConfirmableSms[]
  /** Records of this account no SMS matches («تراکنش‌های اپ بدون پیامک»). */
  unmatchedRecords: LedgerEntry[]
}

export interface AccountReconcile {
  smsAt: number
  smsBalance: number
  /** The app balance at `smsAt`. */
  appBalance: number
  /** App minus bank: positive = more in the app. */
  difference: number
  match: SmsRecordMatch
}

const smsRecordType = (entry: ConfirmableSms) =>
  entry.result.direction === 'debit' ? ('expense' as const) : ('income' as const)

/** Recognised SMS of one account, oldest first. */
export function accountSms(entries: ReviewedSms[], accountId: string): ConfirmableSms[] {
  return entries
    .filter(isConfirmable)
    .filter(entry => entry.result.accountId === accountId)
    .sort((a, b) => a.sms.receivedAt - b.sms.receivedAt)
}

/**
 * One SMS ↔ one record: same direction, amount, account and date (the entry form's
 * duplicate rule with no day tolerance, read in reverse). Oldest SMS first.
 */
export function matchSmsToRecords(
  sms: ConfirmableSms[],
  records: LedgerEntry[],
  accountId: string
): SmsRecordMatch {
  const pool = records.filter(record => record.accountId === accountId)
  const smsTimeOf = new Map<LedgerEntry, number>()
  const missingSms: ConfirmableSms[] = []

  for (const entry of [...sms].sort((a, b) => a.sms.receivedAt - b.sms.receivedAt)) {
    const candidate = {
      type: smsRecordType(entry),
      amount: entry.amount,
      date: smsRecordDate(entry.sms.body, entry.sms.receivedAt)
    }
    const record = pool.find(
      item => !smsTimeOf.has(item) && matchesDuplicate(candidate, item, { dayTolerance: 0 })
    )

    if (record) smsTimeOf.set(record, entry.sms.receivedAt)
    else missingSms.push(entry)
  }

  return {
    smsTimeOf,
    missingSms,
    unmatchedRecords: pool.filter(
      record => !smsTimeOf.has(record) && record.category !== SMS_RECONCILE_CATEGORY
    )
  }
}

/**
 * Did this record's money move after `smsAt`? A matched record moved with its SMS; a
 * correction record belongs before any SMS; otherwise its date decides, and on the
 * SMS's own day its «زمان ثبت» (when entered that day).
 */
export function isAfterSms(record: LedgerEntry, smsAt: number, matchedAt?: number): boolean {
  if (record.category === SMS_RECONCILE_CATEGORY) return false
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

    return total - (record.type === 'expense' ? -record.amount : record.amount)
  }, balance)
}

/** `null` when the account has no recognised SMS with a «مانده». */
export function reconcileAccount(
  accountId: string,
  balance: number,
  sms: ConfirmableSms[],
  records: LedgerEntry[]
): AccountReconcile | null {
  const newest = sms
    .filter(entry => entry.balance !== null && entry.result.accountId === accountId)
    .reduce<ConfirmableSms | null>(
      (best, entry) => (!best || entry.sms.receivedAt > best.sms.receivedAt ? entry : best),
      null
    )

  if (!newest || newest.balance === null) return null

  const match = matchSmsToRecords(sms, records, accountId)
  const smsAt = newest.sms.receivedAt
  const appBalance = appBalanceAt(balance, records, accountId, smsAt, match.smsTimeOf)
  const raw = appBalance - newest.balance

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
  return difference !== 0 && entry?.ignored === difference
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

/**
 * The record that closes the difference (never a direct balance edit): more in the
 * app → an expense, less → an income, dated on the SMS day.
 */
export function correctionRecord(difference: number, smsAt: number) {
  return {
    type: difference > 0 ? ('expense' as const) : ('income' as const),
    title: SMS_RECONCILE_CATEGORY,
    amount: Math.abs(difference),
    category: SMS_RECONCILE_CATEGORY,
    note: `تطبیق با پیامک ${smsDayLabel(smsAt)}`,
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
  entries: Record<string, ReconcileEntry>
): Record<string, string> {
  const lines: Record<string, string> = {}

  for (const account of accounts) {
    const sms = accountSms(reviewed, account.id)
    const result = reconcileAccount(account.id, account.balance, sms, ledger)

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
