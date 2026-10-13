import { pendingReminders } from './recurring'
import { fetchRecurringItems } from './recurringSheet'
import { getItem, setItem } from './storage'
import { getJalaliMonthKey } from '../utils/dateRange'

/** Per spreadsheet: the day this month's line went into the digest. */
export const RECURRING_DIGEST_STORAGE_KEY = 'accounting_recurring_digest_v1'

export interface RecurringDigestGate {
  month: string
  date: string
}

/**
 * «N تکرار ثبت‌نشده» joins the nightly digest once per month: on the first day it is
 * built (repeated syncs that day keep it), never on a later day of the same month.
 */
export function recurringDigestLine(
  pendingCount: number,
  gate: RecurringDigestGate | undefined,
  todayIso: string
): { line: string | null; gate: RecurringDigestGate | undefined } {
  const month = getJalaliMonthKey(todayIso)

  if (!pendingCount || (gate?.month === month && gate.date !== todayIso)) {
    return { line: null, gate }
  }

  return {
    line: `${pendingCount.toLocaleString('fa-IR')} تکرار ثبت‌نشده`,
    gate: { month, date: todayIso }
  }
}

/** Tonight's recurring line (none, or one), for `syncBudgetDigest`. */
export async function recurringDigestLines(
  spreadsheetId: string,
  todayIso: string
): Promise<string[]> {
  const store = getItem<Record<string, RecurringDigestGate>>(RECURRING_DIGEST_STORAGE_KEY) ?? {}
  const pending = pendingReminders(await fetchRecurringItems(spreadsheetId), todayIso)
  const { line, gate } = recurringDigestLine(pending.length, store[spreadsheetId], todayIso)

  if (gate && gate !== store[spreadsheetId]) {
    try {
      setItem(RECURRING_DIGEST_STORAGE_KEY, { ...store, [spreadsheetId]: gate })
    } catch {
      // Private mode: the line may repeat on another day; harmless.
    }
  }

  return line ? [line] : []
}
