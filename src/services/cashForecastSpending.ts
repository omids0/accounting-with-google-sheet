import type { RecurringItem } from '../types'
import { addDaysToIso, diffIsoDays } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

/** The window the daily average looks at: the last three months. */
export const SPENDING_WINDOW_DAYS = 90

/** Under this many days of history the average says too little and is not used. */
export const SPENDING_MIN_HISTORY_DAYS = 14

/** The part of an expense record the average needs. */
export interface SpendingRecord {
  id: string
  /** `YYYY-MM-DD`. */
  date: string
  amount: number
  title: string
  category: string
}

export interface SpendingAverage {
  /** Average per day of the expenses counted; 0 when there is not enough history. */
  perDay: number
  /** Days from the first expense record (at most the window) through today; 0 without records. */
  historyDays: number
  /** False with less than `SPENDING_MIN_HISTORY_DAYS` of history: `perDay` is 0 then. */
  enough: boolean
  counted: number
  /** Left out because an installment, check or debt payment points at them. */
  excludedLinked: number
  /** Left out because they are a recurring post or look like a recurring item. */
  excludedRecurring: number
}

export const NO_SPENDING_HISTORY: SpendingAverage = {
  perDay: 0,
  historyDays: 0,
  enough: false,
  counted: 0,
  excludedLinked: 0,
  excludedRecurring: 0
}

/** A record the reminder card or auto mode posted, or one that repeats an active recurring item. */
function looksRecurring(
  record: SpendingRecord,
  recurring: RecurringItem[],
  postedByRecurring: ReadonlySet<string>
): boolean {
  if (postedByRecurring.has(record.id)) return true

  return recurring.some(
    item =>
      item.active &&
      item.type === 'expense' &&
      item.category === record.category &&
      (item.title || item.category) === (record.title || record.category)
  )
}

/**
 * Average spending per day over the last 90 days, from expense records that no installment, check
 * or debt payment points at and that are not recurring posts: those are already their own events in
 * the forecast, so counting them again would count them twice. The divisor is the days from the
 * first expense record (any kind) to today, at most 90, so a young book is not diluted by days
 * before it began.
 */
export function averageDailySpending(
  records: SpendingRecord[],
  options: {
    todayIso: string
    recurring: RecurringItem[]
    isLinked: (recordId: string) => boolean
    /** Ids of records the app posted for a recurring item (the note it writes on them). */
    postedByRecurring?: ReadonlySet<string>
  }
): SpendingAverage {
  const { todayIso, recurring, isLinked, postedByRecurring = new Set<string>() } = options
  const windowStart = addDaysToIso(todayIso, -(SPENDING_WINDOW_DAYS - 1))
  const inWindow = records.filter(
    record => record.date >= windowStart && record.date <= todayIso && record.amount > 0
  )

  if (!inWindow.length) return NO_SPENDING_HISTORY

  const first = inWindow.reduce((low, record) => (record.date < low ? record.date : low), todayIso)
  const historyDays = diffIsoDays(first, todayIso) + 1
  let total = 0
  let counted = 0
  let excludedLinked = 0
  let excludedRecurring = 0

  for (const record of inWindow) {
    if (isLinked(record.id)) excludedLinked += 1
    else if (looksRecurring(record, recurring, postedByRecurring)) excludedRecurring += 1
    else {
      total += record.amount
      counted += 1
    }
  }

  const enough = historyDays >= SPENDING_MIN_HISTORY_DAYS

  return {
    perDay: enough ? roundMoney(total / historyDays) : 0,
    historyDays,
    enough,
    counted,
    excludedLinked,
    excludedRecurring
  }
}
