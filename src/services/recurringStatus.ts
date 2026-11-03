import type { LedgerEntry } from './recordDuplicates'
import { findWriteDuplicate } from './recordWriteGuard'
import { recurringDueDate, reminderPostDate } from './recurring'
import { findExistingRecordForRecurring } from './recurringDuplicate'
import type { RecurringItem } from '../types'
import { getJalaliMonthKey } from '../utils/dateRange'

/**
 * What «ثبت همه» would do with an item, known before the user taps:
 * `new` — nothing like it is recorded, it will be written;
 * `registered` — the same payment is already a record (what posting would mark instead of
 * writing a second one);
 * `probable` — a record that looks like it (the shared duplicate rule) exists.
 */
export type RecurringStatus =
  | { kind: 'new' }
  | { kind: 'registered'; record: LedgerEntry }
  | { kind: 'probable'; record: LedgerEntry }

export const NEW_STATUS: RecurringStatus = { kind: 'new' }

/** Items that need a decision before posting (not `new`). */
export function needsAttention(status: RecurringStatus | undefined): boolean {
  return !!status && status.kind !== 'new'
}

/**
 * Status of every item for the month of `todayIso`, in list order: one record answers one item
 * (an earlier item that took it leaves it out for the later ones).
 */
export function recurringStatuses(
  items: readonly RecurringItem[],
  ledger: LedgerEntry[],
  todayIso: string
): Map<string, RecurringStatus> {
  const monthKey = getJalaliMonthKey(todayIso)
  const taken = new Set<string>()
  const result = new Map<string, RecurringStatus>()

  for (const item of items) {
    const due = recurringDueDate(item, monthKey)
    const registered = findExistingRecordForRecurring(item, due, ledger, taken)

    if (registered) {
      if (registered.id) taken.add(registered.id)
      result.set(item.id, { kind: 'registered', record: registered })
      continue
    }

    // The record would carry the due day, or today for an item posted ahead of its day.
    const dates = [...new Set([due, reminderPostDate(item, todayIso)])]
    const probable = dates
      .map(date =>
        findWriteDuplicate(
          {
            type: item.type,
            amount: item.amount,
            date,
            accountId: item.accountId,
            category: item.category,
            title: item.title || item.category
          },
          ledger,
          { excludeIds: taken }
        )
      )
      .find(Boolean)

    if (probable) {
      if (probable.id) taken.add(probable.id)
      result.set(item.id, { kind: 'probable', record: probable })
    } else {
      result.set(item.id, NEW_STATUS)
    }
  }

  return result
}
