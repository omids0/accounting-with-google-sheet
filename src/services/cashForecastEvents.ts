import { isReceivedCheck } from './checkDirection'
import { getInstallmentPaymentAmount } from './installmentsConstants'
import { advancePersonalReminderDueDate } from './personalReminders'
import { isHandledFor, recurringDueDate } from './recurring'
import type { Check, Dang, InstallmentPlan, PersonalReminder, RecurringItem } from '../types'
import { dangRemaining } from '../utils/dangLedger'
import { getJalaliMonthKey, nextJalaliMonthKey } from '../utils/dateRange'

export type ForecastEventKind =
  | 'check'
  | 'installment'
  | 'debt'
  | 'recurring'
  | 'reminder'
  | 'purchase'

/** One known movement of money. `amount` is signed: money in is positive, money out negative. */
export interface ForecastEvent {
  id: string
  kind: ForecastEventKind
  title: string
  /** Day it happens, `YYYY-MM-DD`. */
  date: string
  amount: number
  /** Wallet account it moves ('' / missing: the pool of the included accounts). */
  accountId?: string
  /** Was due before today and unpaid: counted today, as money I still have to pay. */
  late?: boolean
}

/** Something known that the forecast leaves out, with the reason in words. */
export interface ForecastLeftOut {
  id: string
  title: string
  amount: number
  date: string
  reason: string
}

export interface ForecastSources {
  checks: Check[]
  plans: InstallmentPlan[]
  dangs: Dang[]
  recurring: RecurringItem[]
  reminders: PersonalReminder[]
}

export interface ForecastEventsResult {
  events: ForecastEvent[]
  leftOut: ForecastLeftOut[]
}

const day = (iso: string) => iso.slice(0, 10)

/** A payable already due is assumed paid today; money coming in is never assumed early or late. */
function paymentDate(dueIso: string, todayIso: string): { date: string; late: boolean } {
  const due = day(dueIso)

  return due < todayIso ? { date: todayIso, late: true } : { date: due, late: false }
}

function checkEvents(
  checks: Check[],
  todayIso: string,
  endIso: string,
  leftOut: ForecastLeftOut[]
): ForecastEvent[] {
  const events: ForecastEvent[] = []

  for (const check of checks) {
    if (check.paid || !(check.amount > 0)) continue

    const due = day(check.dueDate)
    const title = check.counterparty || check.checkNumber || 'چک'

    if (isReceivedCheck(check)) {
      if (due < todayIso) {
        leftOut.push({
          id: `check_${check.id}`,
          title,
          amount: check.amount,
          date: due,
          reason: 'چک دریافتی که موعدش گذشته و وصول نشده؛ تاریخ وصولش معلوم نیست'
        })
      } else if (due <= endIso) {
        events.push({
          id: `check_${check.id}`,
          kind: 'check',
          title,
          date: due,
          amount: check.amount
        })
      }
      continue
    }

    const { date, late } = paymentDate(due, todayIso)

    if (date <= endIso) {
      events.push({
        id: `check_${check.id}`,
        kind: 'check',
        title,
        date,
        amount: -check.amount,
        late
      })
    }
  }

  return events
}

function installmentEvents(plans: InstallmentPlan[], todayIso: string, endIso: string) {
  const events: ForecastEvent[] = []

  for (const plan of plans) {
    for (const payment of plan.payments) {
      if (payment.paid) continue

      const amount = getInstallmentPaymentAmount(payment, plan)
      const { date, late } = paymentDate(payment.dueDate, todayIso)

      if (!(amount > 0) || date > endIso) continue
      events.push({
        id: `installment_${plan.id}-${payment.n}`,
        kind: 'installment',
        title: plan.title,
        date,
        amount: -amount,
        late
      })
    }
  }

  return events
}

function debtEvents(dangs: Dang[], todayIso: string, endIso: string) {
  const events: ForecastEvent[] = []

  for (const dang of dangs) {
    const remaining = dangRemaining(dang)
    const { date, late } = paymentDate(dang.date, todayIso)

    if (!(remaining > 0) || date > endIso) continue
    events.push({
      id: `debt_${dang.id}`,
      kind: 'debt',
      title: dang.title,
      date,
      amount: -remaining,
      late
    })
  }

  return events
}

/**
 * Every month from this one through the end date. This month's occurrence is skipped once it is
 * posted or skipped (the money is already in the balance); one whose day has passed but is still
 * waiting counts today.
 */
function recurringEvents(
  items: RecurringItem[],
  todayIso: string,
  endIso: string,
  leftOut: ForecastLeftOut[]
) {
  const events: ForecastEvent[] = []
  const firstKey = getJalaliMonthKey(todayIso)
  const lastKey = getJalaliMonthKey(endIso)

  for (const item of items) {
    if (!item.active) continue

    for (let key = firstKey; key <= lastKey; key = nextJalaliMonthKey(key)) {
      if (isHandledFor(item, key)) continue

      const { date, late } = paymentDate(recurringDueDate(item, key), todayIso)

      if (date > endIso) continue

      const title = item.title || item.category
      const id = `recurring_${item.id}_${key}`

      if (late && item.type === 'income') {
        // Income whose day passed and is not recorded: its arrival is not assumed.
        leftOut.push({
          id,
          title,
          amount: item.amount,
          date: recurringDueDate(item, key),
          reason: 'درآمد تکراری که روزش گذشته و هنوز ثبت نشده'
        })
        continue
      }
      events.push({
        id,
        kind: 'recurring',
        title,
        date,
        amount: item.type === 'income' ? item.amount : -item.amount,
        accountId: item.accountId,
        late
      })
    }
  }

  return events
}

/** Personal reminders with an amount, as money to pay; monthly and yearly ones repeat. */
function reminderEvents(reminders: PersonalReminder[], todayIso: string, endIso: string) {
  const events: ForecastEvent[] = []

  for (const reminder of reminders) {
    if (!reminder.enabled || !reminder.dueDate || !(reminder.amount > 0)) continue

    let due: string | null = day(reminder.dueDate)

    for (let guard = 0; due && guard < 70; guard += 1) {
      const { date, late } = paymentDate(due, todayIso)

      if (date > endIso) break
      events.push({
        id: `reminder_${reminder.id}_${due}`,
        kind: 'reminder',
        title: reminder.title.trim() || reminder.category || 'یادآوری',
        date,
        amount: -reminder.amount,
        late
      })
      due = advancePersonalReminderDueDate(due, reminder.recurrence)
      // A late, repeating reminder is counted once today, not once per missed period.
      while (due && due < todayIso) due = advancePersonalReminderDueDate(due, reminder.recurrence)
    }
  }

  return events
}

/**
 * The known money movements from today through `endIso` (both `YYYY-MM-DD`), earliest first.
 * Receivables have no due date, so they are never in here.
 */
export function buildForecastEvents(
  sources: ForecastSources,
  todayIso: string,
  endIso: string
): ForecastEventsResult {
  const leftOut: ForecastLeftOut[] = []

  const events = [
    ...checkEvents(sources.checks, todayIso, endIso, leftOut),
    ...installmentEvents(sources.plans, todayIso, endIso),
    ...debtEvents(sources.dangs, todayIso, endIso),
    ...recurringEvents(sources.recurring, todayIso, endIso, leftOut),
    ...reminderEvents(sources.reminders, todayIso, endIso)
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  return { events, leftOut }
}
