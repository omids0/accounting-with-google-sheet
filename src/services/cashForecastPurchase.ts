import { computeForecast, type ForecastInput, type ForecastPoint } from './cashForecast'
import type { ForecastEvent } from './cashForecastEvents'
import { addDaysToIso, diffIsoDays } from '../utils/jalaliDate'

/** `none`: nothing to weigh; `out-of-range`: the date is after the days the forecast covers. */
export type PurchaseVerdict = 'none' | 'ok' | 'tight' | 'short' | 'out-of-range'

export interface PurchaseAssessment {
  verdict: PurchaseVerdict
  amount: number
  /** Day the purchase is weighed on (today when none is given). */
  date: string
  /** Lowest estimated balance with the purchase, and the day it happens. */
  lowest: ForecastPoint
  /** How far below zero the lowest balance is (0 unless `short`). */
  shortfall: number
  safeMargin: number
  /** The forecast already goes below zero without this purchase. */
  alreadyShort: boolean
  /** Lowest estimated balance without the purchase, and its day. */
  baselineLowest: ForecastPoint
  /** The earliest later day on which the same purchase keeps every day at zero or more. */
  suggestedDate?: string
}

function withPurchase(input: ForecastInput, amount: number, date: string): ForecastInput {
  const purchase: ForecastEvent = {
    id: 'purchase',
    kind: 'purchase',
    title: 'خرید',
    date,
    amount: -amount
  }

  return { ...input, events: [...input.events, purchase] }
}

/**
 * «می‌توانم بخرم؟»: puts one purchase on the forecast and reads the answer off the lowest balance
 * and its day only. A later day is suggested only when recomputing with it really clears zero.
 */
export function assessPurchase(
  input: ForecastInput,
  purchase: { amount: number; date?: string }
): PurchaseAssessment {
  const base = computeForecast(input)
  const amount = Number.isFinite(purchase.amount) ? Math.max(0, purchase.amount) : 0
  const requested = purchase.date || input.todayIso
  const date = requested < input.todayIso ? input.todayIso : requested
  // The margin comes from the plain forecast, so moving the purchase never moves the yardstick.
  const safeMargin = base.safeMargin
  const alreadyShort = base.lowest.balance < 0
  const common = { amount, date, safeMargin, alreadyShort, baselineLowest: base.lowest }

  if (!(amount > 0)) {
    return { ...common, verdict: 'none', lowest: base.lowest, shortfall: 0 }
  }
  if (date > input.endIso) {
    return { ...common, verdict: 'out-of-range', lowest: base.lowest, shortfall: 0 }
  }

  const run = (on: string) => computeForecast({ ...withPurchase(input, amount, on), safeMargin })
  const result = run(date)
  const { lowest } = result

  if (lowest.balance >= 0) {
    return {
      ...common,
      verdict: lowest.balance < safeMargin ? 'tight' : 'ok',
      lowest,
      shortfall: 0
    }
  }

  // Waiting cannot help when the days are already below zero without the purchase.
  const span = alreadyShort ? 0 : diffIsoDays(date, input.endIso)
  let suggestedDate: string | undefined

  for (let step = 1; step <= span && !suggestedDate; step += 1) {
    const later = addDaysToIso(date, step)

    if (run(later).lowest.balance >= 0) suggestedDate = later
  }

  return { ...common, verdict: 'short', lowest, shortfall: -lowest.balance, suggestedDate }
}
