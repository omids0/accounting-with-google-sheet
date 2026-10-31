import type { ForecastEvent } from './cashForecastEvents'
import { getJalaliMonthKey, getJalaliMonthRange } from '../utils/dateRange'
import { addDaysToIso, diffIsoDays } from '../utils/jalaliDate'
import { roundMoney } from '../utils/roundMoney'

/** How far the forecast looks: to the end of this Jalali month, or a number of days. */
export type ForecastView = 'month' | 30 | 60

export interface ForecastAccount {
  id: string
  title: string
  balance: number
}

export type ForecastDayState = 'ok' | 'tight' | 'negative'

export interface ForecastDay {
  date: string
  /** Estimated balance of the included accounts at the end of this day. */
  balance: number
  /** Daily spending assumed on this day (0 today: today is already in the balance). */
  spending: number
  events: ForecastEvent[]
  state: ForecastDayState
}

export interface ForecastPoint {
  date: string
  balance: number
}

export interface ForecastInput {
  /** Today, `YYYY-MM-DD`. */
  todayIso: string
  /** Last day looked at, `YYYY-MM-DD`. */
  endIso: string
  accounts: ForecastAccount[]
  /** Ids of accounts the user left out; their balance and their own events are ignored. */
  excludedAccountIds?: ReadonlySet<string>
  events: ForecastEvent[]
  /** Spending per day on top of the known events, from tomorrow on. */
  dailySpending: number
  /** Received checks arrive this many days after their due date. */
  incomingCheckDelayDays?: number
  /** Below this a day is «tight». Defaults to `defaultSafeMargin`. */
  safeMargin?: number
}

export interface ForecastResult {
  startBalance: number
  days: ForecastDay[]
  endBalance: number
  lowest: ForecastPoint
  /** First day the balance is below zero, or null. */
  firstNegativeDate: string | null
  included: ForecastAccount[]
  excluded: ForecastAccount[]
  /** Events skipped because they belong to a left-out account. */
  skippedEvents: ForecastEvent[]
  safeMargin: number
}

/** A week of the assumed daily spending, or 5% of what is on hand, whichever is larger. */
export function defaultSafeMargin(startBalance: number, dailySpending: number): number {
  return roundMoney(Math.max(dailySpending * 7, Math.max(startBalance, 0) * 0.05))
}

/** Last day of the view: the end of this Jalali month, or today plus 30 / 60 days. */
export function forecastEndIso(todayIso: string, view: ForecastView): string {
  if (view !== 'month') return addDaysToIso(todayIso, view)

  return getJalaliMonthRange(getJalaliMonthKey(todayIso))?.end ?? addDaysToIso(todayIso, 30)
}

function stateOf(balance: number, safeMargin: number): ForecastDayState {
  if (balance < 0) return 'negative'

  return balance < safeMargin ? 'tight' : 'ok'
}

function dateOfEvent(event: ForecastEvent, input: ForecastInput): string {
  const delay = input.incomingCheckDelayDays ?? 0

  return event.kind === 'check' && event.amount > 0 && delay > 0
    ? addDaysToIso(event.date, delay)
    : event.date
}

/**
 * Day-by-day estimated balance of the included accounts from today to `endIso`: today's balances,
 * the known events on their dates, and a flat daily spending. Pure; every figure is an estimate.
 */
export function computeForecast(input: ForecastInput): ForecastResult {
  const skip = input.excludedAccountIds ?? new Set<string>()
  const included = input.accounts.filter(account => !skip.has(account.id))
  const excluded = input.accounts.filter(account => skip.has(account.id))
  const startBalance = roundMoney(included.reduce((sum, account) => sum + account.balance, 0))
  const safeMargin = input.safeMargin ?? defaultSafeMargin(startBalance, input.dailySpending)
  const spending = Math.max(0, Number.isFinite(input.dailySpending) ? input.dailySpending : 0)

  const skippedEvents: ForecastEvent[] = []
  const byDate = new Map<string, ForecastEvent[]>()

  for (const event of input.events) {
    if (event.accountId && skip.has(event.accountId)) {
      skippedEvents.push(event)
      continue
    }

    const moved = dateOfEvent(event, input)
    const date = moved < input.todayIso ? input.todayIso : moved
    const bucket = byDate.get(date)

    if (bucket) bucket.push(event)
    else byDate.set(date, [event])
  }

  const dayCount = Math.max(0, diffIsoDays(input.todayIso, input.endIso))
  const days: ForecastDay[] = []
  let balance = startBalance

  for (let index = 0; index <= dayCount; index += 1) {
    const date = addDaysToIso(input.todayIso, index)
    const events = byDate.get(date) ?? []
    const daySpending = index === 0 ? 0 : spending

    balance = roundMoney(events.reduce((sum, event) => sum + event.amount, balance) - daySpending)
    days.push({ date, balance, spending: daySpending, events, state: stateOf(balance, safeMargin) })
  }

  const lowestDay = days.reduce((low, day) => (day.balance < low.balance ? day : low), days[0])
  const firstNegative = days.find(day => day.balance < 0)

  return {
    startBalance,
    days,
    endBalance: days[days.length - 1].balance,
    lowest: { date: lowestDay.date, balance: lowestDay.balance },
    firstNegativeDate: firstNegative?.date ?? null,
    included,
    excluded,
    skippedEvents,
    safeMargin
  }
}
