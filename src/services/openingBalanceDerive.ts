import { getJalaliMonthKey, listJalaliMonthKeys, parseJalaliMonthKey } from '../utils/dateRange'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

export interface MonthlyNetTotals {
  income: number
  expense: number
}

export interface OpeningBalanceAnchor {
  monthKey: string
  amount: number
}

type ValueRecord = { values: Record<string, string> }

/**
 * Buckets every income/expense record by Jalali month. Unlike the dashboard's
 * yearly flow this is not clamped to a single year, because opening balances
 * chain across year boundaries.
 */
export function aggregateMonthlyNet(
  incomeRecords: ValueRecord[],
  expenseRecords: ValueRecord[],
  incomeDateField: string,
  expenseDateField: string
): Map<string, MonthlyNetTotals> {
  const totals = new Map<string, MonthlyNetTotals>()

  const collect = (
    records: ValueRecord[],
    dateField: string,
    bucket: keyof MonthlyNetTotals
  ): void => {
    for (const record of records) {
      const date = normalizeSheetDate(record.values[dateField] ?? '')

      if (!date) continue

      const monthKey = getJalaliMonthKey(date)

      const entry = totals.get(monthKey) ?? { income: 0, expense: 0 }

      entry[bucket] += parseNumeric(record.values.amount)
      totals.set(monthKey, entry)
    }
  }

  collect(incomeRecords, incomeDateField, 'income')
  collect(expenseRecords, expenseDateField, 'expense')

  return totals
}

/**
 * Chains opening balances forward from the anchor month:
 * `opening(m + 1) = opening(m) + income(m) - expense(m)`.
 *
 * Months before the anchor are intentionally absent — they predate automation
 * and stay as historical, manually entered rows.
 */
export function deriveOpeningBalances(
  anchor: OpeningBalanceAnchor,
  monthlyNet: Map<string, MonthlyNetTotals>,
  throughMonthKey: string
): Map<string, number> {
  const openings = new Map<string, number>()

  if (!parseJalaliMonthKey(anchor.monthKey)) return openings

  const months = listJalaliMonthKeys(anchor.monthKey, throughMonthKey)

  if (!months.length) {
    openings.set(anchor.monthKey, anchor.amount)

    return openings
  }

  let running = anchor.amount

  for (const monthKey of months) {
    openings.set(monthKey, running)

    const totals = monthlyNet.get(monthKey)

    running += (totals?.income ?? 0) - (totals?.expense ?? 0)
  }

  return openings
}

export function closingBalanceOf(
  openings: Map<string, number>,
  monthlyNet: Map<string, MonthlyNetTotals>,
  monthKey: string
): number {
  const opening = openings.get(monthKey) ?? 0

  const totals = monthlyNet.get(monthKey)

  return opening + (totals?.income ?? 0) - (totals?.expense ?? 0)
}

export interface StartAmountReseedInput {
  anchorMonthKey: string
  currentMonthKey: string
  storedAmount: number
  walletTotal: number
  hasRecords: boolean
}

/**
 * A zero start amount almost always means the dashboard loaded before the user
 * got around to entering a wallet account, and freezing the chain at zero makes
 * every later month wrong. Until the first transaction is recorded the wallet
 * total is still a faithful "money I had before I started" snapshot, so keep
 * adopting it.
 *
 * Once anything is recorded the snapshot may already include that
 * transaction's effect, and once the month rolls over the amount is load
 * bearing for derived months — either way it must stay put.
 */
export function shouldReseedStartAmount(input: StartAmountReseedInput): boolean {
  const { anchorMonthKey, currentMonthKey, storedAmount, walletTotal, hasRecords } = input

  if (anchorMonthKey !== currentMonthKey) return false
  if (hasRecords) return false
  if (storedAmount !== 0) return false

  return walletTotal !== 0
}

export function isBeforeAnchor(monthKey: string, anchorMonthKey: string): boolean {
  if (!parseJalaliMonthKey(monthKey) || !parseJalaliMonthKey(anchorMonthKey)) return false

  return monthKey < anchorMonthKey
}

export function findEarliestRecordDate(
  incomeRecords: ValueRecord[],
  expenseRecords: ValueRecord[],
  incomeDateField: string,
  expenseDateField: string
): string {
  let earliest = ''

  const scan = (records: ValueRecord[], dateField: string): void => {
    for (const record of records) {
      const date = normalizeSheetDate(record.values[dateField] ?? '')

      if (!date) continue

      if (!earliest || date < earliest) earliest = date
    }
  }

  scan(incomeRecords, incomeDateField)
  scan(expenseRecords, expenseDateField)

  return earliest
}

/**
 * Membership date wins, then the oldest existing record (users who predate the
 * membership column), then the caller's fallback.
 */
export function resolveAccountingStartDate(
  membershipDate: string,
  earliestRecordDate: string,
  fallbackDate: string
): string {
  const candidates = [membershipDate, earliestRecordDate].map(value =>
    normalizeSheetDate(value ?? '')
  )

  const valid = candidates.filter(Boolean)

  if (!valid.length) return fallbackDate

  return valid.reduce((earliest, current) => (current < earliest ? current : earliest))
}
