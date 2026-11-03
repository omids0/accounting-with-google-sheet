import type { LedgerEntry } from './recordDuplicates'
import { isHandledFor } from './recurring'
import type { RecurringItem } from '../types'
import { getJalaliMonthKey } from '../utils/dateRange'
import { diffIsoDays } from '../utils/jalaliDate'

/**
 * A recurring item and a record can stand for the same money (the monthly allowance arrives as a
 * bank SMS and is also on the «ثبت تکرارها» card). Both rules here are pure; callers decide what to
 * do with a match (mark the item as posted, never a second record).
 */

/** Days a record may sit from the item's due date and still count as that month's payment. */
export const RECURRING_DUPLICATE_DAYS = 2

/** The title a record posted for this item carries. */
function itemTitle(item: RecurringItem): string {
  return item.title || item.category
}

/**
 * Same category as the item (an item without one: the same title), and, when both name an
 * account, the same account. «اجاره» and «قسط» with one amount never match each other's record.
 */
function sameKind(
  item: RecurringItem,
  record: Pick<LedgerEntry, 'category' | 'title' | 'accountId'>
): boolean {
  if (record.accountId && item.accountId && record.accountId !== item.accountId) return false

  return item.category
    ? (record.category ?? '') === item.category
    : (record.title ?? '') === itemTitle(item)
}

/** The same title first, then the nearest day. */
function bestRecord(item: RecurringItem, due: string, records: LedgerEntry[]): LedgerEntry | null {
  const rank = (record: LedgerEntry) =>
    (record.title === itemTitle(item) ? 0 : 1000) + Math.abs(diffIsoDays(record.date, due))

  return [...records].sort((a, b) => rank(a) - rank(b))[0] ?? null
}

/**
 * A record that already stands for this item's payment: same type, same amount (to the rial),
 * same category and account, dated within two days of `dueIso` — whether the user typed it or it
 * came from a bank SMS. `takenIds` are records an earlier item of the same run already used.
 */
export function findExistingRecordForRecurring(
  item: RecurringItem,
  dueIso: string,
  ledger: LedgerEntry[],
  takenIds: ReadonlySet<string> = new Set()
): LedgerEntry | null {
  if (!dueIso) return null

  return bestRecord(
    item,
    dueIso,
    ledger.filter(
      record =>
        record.type === item.type &&
        record.amount === item.amount &&
        !!record.date &&
        Math.abs(diffIsoDays(record.date, dueIso)) <= RECURRING_DUPLICATE_DAYS &&
        !(record.id && takenIds.has(record.id)) &&
        sameKind(item, record)
    )
  )
}

/** A record just saved from a bank SMS, reduced to what the item lookup needs. */
export type SmsRecordForRecurring = Pick<
  LedgerEntry,
  'type' | 'amount' | 'accountId' | 'category' | 'title' | 'date'
>

/**
 * The still-open item of this month that a bank SMS record pays: active, same type, amount and
 * account (what `findRecurringMatch` borrows the category from), the same category, and a date in
 * the month `monthKey`. `null` when the item is already posted or skipped for that month.
 */
export function findRecurringForSmsRecord(
  record: SmsRecordForRecurring,
  items: RecurringItem[],
  monthKey: string
): RecurringItem | null {
  if (!record.category || getJalaliMonthKey(record.date) !== monthKey) return null

  const open = items.filter(
    item =>
      item.active &&
      item.type === record.type &&
      item.amount === record.amount &&
      item.accountId === record.accountId &&
      item.category === record.category &&
      !isHandledFor(item, monthKey)
  )

  return open.find(item => itemTitle(item) === record.title) ?? open[0] ?? null
}
