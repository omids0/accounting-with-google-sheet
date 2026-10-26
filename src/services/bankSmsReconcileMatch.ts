import { smsRecordDate } from './bankSmsDate'
import type { ConfirmableSms } from './bankSmsQueue'
import {
  LINKED_PAYMENT_DAYS,
  NO_COVERAGE,
  NO_LINKED,
  uncoveredLinked,
  type LinkedRecords,
  type SmsCoverage
} from './bankSmsSplit'
import { matchesDuplicate, type LedgerEntry } from './recordDuplicates'
import { SMS_RECONCILE_CATEGORY } from '../utils/protectedCategories'

export interface SmsRecordMatch {
  /** Each matched record, with the `receivedAt` of its SMS (the newest one for a split payment). */
  smsTimeOf: Map<LedgerEntry, number>
  /** SMS of this account with no record («پیامک‌هایی که در اپ نیستند»). */
  missingSms: ConfirmableSms[]
  /** Records of this account no SMS matches («تراکنش‌های اپ بدون پیامک»). */
  unmatchedRecords: LedgerEntry[]
}

/** SMS id → the payment record it was closed as «بخشی از آن است» (`smsCoverageParts`). */
export type SmsParts = ReadonlyMap<string, string>

/**
 * What the queue knows about records beyond amount and day, built outside from the local mirror
 * and the SMS prefs so the matching stays pure: which records are debt/receivable payments (they
 * match within ±3 days, the payment date is typed by hand), how much of a record SMS already
 * covered, and which record each split SMS belongs to.
 */
export interface ReconcileLinks {
  linked: LinkedRecords
  coverage: SmsCoverage
  parts: SmsParts
}

export const NO_RECONCILE_LINKS: ReconcileLinks = {
  linked: NO_LINKED,
  coverage: NO_COVERAGE,
  parts: new Map()
}

/** Every correction note starts with this, whatever category the user picked. */
export const RECONCILE_NOTE_PREFIX = 'تطبیق با پیامک'

/**
 * A record written by «تنظیم دستی موجودی». Besides the system category «تطبیق», a
 * correction can sit in a category the user picked (e.g. «کارمزد»), so the note marks it.
 */
export function isReconcileCorrection(record: Pick<LedgerEntry, 'category' | 'note'>): boolean {
  return (
    record.category === SMS_RECONCILE_CATEGORY ||
    (record.note ?? '').startsWith(RECONCILE_NOTE_PREFIX)
  )
}

const smsRecordType = (entry: ConfirmableSms) =>
  entry.result.direction === 'debit' ? ('expense' as const) : ('income' as const)

/**
 * One SMS ↔ one record, the queue's rules read in reverse. Oldest SMS first:
 * 1. an SMS closed as a part of a payment belongs to that record (several SMS, one record);
 * 2. same direction, amount, account and day;
 * 3. else a debt/receivable payment record of the same amount within ±3 days (not one SMS already
 *    covered a part of).
 */
export function matchSmsToRecords(
  sms: ConfirmableSms[],
  records: LedgerEntry[],
  accountId: string,
  links: ReconcileLinks = NO_RECONCILE_LINKS
): SmsRecordMatch {
  const pool = records.filter(record => record.accountId === accountId)
  const smsTimeOf = new Map<LedgerEntry, number>()
  const missingSms: ConfirmableSms[] = []
  const payments = uncoveredLinked(links.linked, links.coverage)

  for (const entry of [...sms].sort((a, b) => a.sms.receivedAt - b.sms.receivedAt)) {
    const candidate = {
      type: smsRecordType(entry),
      amount: entry.amount,
      date: smsRecordDate(entry.sms.body, entry.sms.receivedAt)
    }
    const partOf = links.parts.get(entry.sms.id)
    const part = partOf ? pool.find(item => item.id === partOf) : undefined
    const free = (item: LedgerEntry) => !smsTimeOf.has(item)
    const record =
      part ??
      pool.find(item => free(item) && matchesDuplicate(candidate, item, { dayTolerance: 0 })) ??
      pool.find(
        item =>
          free(item) &&
          !!item.id &&
          payments.has(item.id) &&
          matchesDuplicate(candidate, item, { dayTolerance: LINKED_PAYMENT_DAYS })
      )

    if (record) smsTimeOf.set(record, entry.sms.receivedAt)
    else missingSms.push(entry)
  }

  return {
    smsTimeOf,
    missingSms,
    unmatchedRecords: pool.filter(
      record => !smsTimeOf.has(record) && !isReconcileCorrection(record)
    )
  }
}
