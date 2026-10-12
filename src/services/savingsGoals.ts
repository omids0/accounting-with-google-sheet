import type { LedgerEntry } from './walletLedger'
import type { SavingsGoal, SavingsGoalStatus } from '../types'
import { isDateInRange, type DateRange } from '../utils/dateRange'
import { isoToJalali } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'

/** «گردش حساب» kind of a deposit into (negative delta) or withdrawal from a goal. */
export const GOAL_LEDGER_SOURCE = 'goal-deposit'

const STATUSES: SavingsGoalStatus[] = ['active', 'reached', 'archived']

export function rowToGoal(row: string[]): SavingsGoal | null {
  const id = String(row[0] ?? '').trim()
  const title = String(row[2] ?? '').trim()

  if (!id || !title) return null

  const status = String(row[7] ?? '').trim() as SavingsGoalStatus

  return {
    id,
    createdAt: String(row[1] ?? ''),
    title,
    target: parseNumeric(row[3]),
    targetDate: String(row[4] ?? '').trim(),
    defaultAccountId: String(row[5] ?? '').trim(),
    note: String(row[6] ?? ''),
    status: STATUSES.includes(status) ? status : 'active'
  }
}

export function goalToRow(goal: SavingsGoal): string[] {
  return [
    goal.id,
    goal.createdAt,
    goal.title,
    String(goal.target),
    goal.targetDate,
    goal.defaultAccountId,
    goal.note,
    goal.status
  ]
}

function goalEntries(ledger: LedgerEntry[]): LedgerEntry[] {
  return ledger.filter(entry => entry.source === GOAL_LEDGER_SOURCE && entry.recordId)
}

/**
 * Goal id → balance. A deposit takes money out of a wallet account (negative delta),
 * so the goal holds the opposite of the sum of its rows.
 */
export function goalBalances(ledger: LedgerEntry[]): Map<string, number> {
  const balances = new Map<string, number>()

  for (const entry of goalEntries(ledger)) {
    const id = entry.recordId!

    balances.set(id, (balances.get(id) ?? 0) - entry.delta)
  }

  return balances
}

/** Goal id → deposits (withdrawals left out) dated inside `range`. */
export function goalDepositsIn(ledger: LedgerEntry[], range: DateRange): Map<string, number> {
  const deposits = new Map<string, number>()

  for (const entry of goalEntries(ledger)) {
    if (entry.delta >= 0 || !isDateInRange(entry.date, range)) continue

    const id = entry.recordId!

    deposits.set(id, (deposits.get(id) ?? 0) - entry.delta)
  }

  return deposits
}

export function isGoalReached(balance: number, target: number): boolean {
  return target > 0 && balance >= target
}

/**
 * Whole Jalali months from today to the target date: 20 مهر → 1 فروردین is 5
 * (the 1st comes before the 20th). 0 once the date has passed.
 */
export function monthsUntil(todayIso: string, targetIso: string): number {
  if (!targetIso) return 0

  const today = isoToJalali(todayIso)
  const target = isoToJalali(targetIso)
  let months = (target.year - today.year) * 12 + (target.month - today.month)

  if (target.day < today.day) months -= 1

  return Math.max(0, months)
}

/** Monthly amount still needed, rounded up to the thousand; all of it when no month is left. */
export function neededPerMonth(balance: number, target: number, months: number): number {
  const remaining = Math.max(0, target - balance)

  if (!remaining) return 0
  if (months <= 0) return remaining

  return Math.ceil(remaining / months / 1000) * 1000
}

/** Status after the balance moved: reaching the target marks it, falling back reopens it. */
export function nextGoalStatus(goal: SavingsGoal, balance: number): SavingsGoalStatus {
  if (goal.status === 'archived') return 'archived'

  return isGoalReached(balance, goal.target) ? 'reached' : 'active'
}
