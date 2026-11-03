import type { ConfirmableSms } from './bankSmsQueue'
import { findRecurringForSmsRecord } from './recurringDuplicate'
import {
  fetchRecurringItems,
  recurringLockKey,
  saveRecurringItem,
  stripRow
} from './recurringSheet'
import { isSharedWorkspace } from './workspace'
import { getJalaliMonthKey } from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'
import { runSerial } from '../utils/serialQueue'
import { showInfo } from '../utils/toast'

/** What a record saved from a bank SMS says about itself. */
export interface SmsRecordFacts {
  type: 'income' | 'expense'
  title: string
  category: string
  /** `YYYY-MM-DD` */
  date: string
  /** The account the record moved; the SMS account when omitted. */
  accountId?: string
  /** Positive amount; the SMS amount when omitted. */
  amount?: number
}

/**
 * Called by every path that turns a bank SMS into a record (card confirm, bulk, the entry form
 * opened from an SMS): when the record is the payment of this month's recurring item (same amount,
 * account and category), the item counts as posted — «ثبت همه» then no longer lists it and auto mode
 * no longer posts it — and the user is told. No second record is made. Never throws: the record
 * is already saved, this is only the marker.
 */
export async function markRecurringPaidBySms(
  spreadsheetId: string,
  entry: ConfirmableSms,
  record: SmsRecordFacts,
  todayIso: string = getTodayIso()
): Promise<void> {
  try {
    if (isSharedWorkspace(spreadsheetId)) return

    const monthKey = getJalaliMonthKey(todayIso)
    const facts = {
      type: record.type,
      amount: record.amount ?? entry.amount,
      accountId: record.accountId ?? entry.result.accountId,
      category: record.category,
      title: record.title,
      date: record.date
    }

    // Serialised with «ثبت همه»: both read the item's «آخرین ثبت» and then write it.
    const item = await runSerial(recurringLockKey(spreadsheetId), async () => {
      const items = (await fetchRecurringItems(spreadsheetId)).map(stripRow)
      const open = findRecurringForSmsRecord(facts, items, monthKey)

      if (open) await saveRecurringItem(spreadsheetId, { ...open, lastPosted: monthKey })

      return open
    })

    if (item) {
      showInfo(
        `«${item.title || item.category}» با این پیامک ثبت شد؛ تکرار این ماه دوباره ثبت نمی‌شود`
      )
    }
  } catch {
    // The marker is a convenience; the saved record stands either way.
  }
}
