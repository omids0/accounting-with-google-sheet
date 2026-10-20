import { chargeMonthCard } from './buildingChargeMonths'
import { creditsOf } from './buildingCharges'
import { flowRecordsIn, type FlowSide } from './buildingDashboard'
import { expenseBreakdown } from './buildingExpenseMeta'
import type { ManagedItem } from './buildingLists'
import {
  monthKeyFor,
  monthKeyOfIso,
  monthLabel,
  monthName,
  monthRangeOf,
  recentMonthKeys
} from './buildingMonths'
import { sumByCategory } from './dashboardAggregation'
import { rowToLedgerEntry, type LedgerEntry } from './walletLedger'
import type { UnitRowData } from '../components/buildings/unitRows'
import type { CategorySummary, Dang, MonthlyFlow, Receivable } from '../types'
import type { DateRange } from '../utils/dateRange'
import { isoToJalali } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'
import { parseNumeric } from '../utils/parseNumeric'

/** The window a report covers: a Jalali year, the last six months, or one month. */
export type ReportMode = 'year' | 'six' | 'month'

export interface ReportPeriod {
  mode: ReportMode
  /** A year (`1405`) for `year`, a month key (`1405-07`) for `month`; unused for `six`. */
  value: string
}

export interface PeriodWindow {
  /** «۱۴۰۵», «۶ ماه اخیر», «مهر ۱۴۰۵»: what «گزارش مجمع …» names. */
  title: string
  range: DateRange
  /** Jalali month keys, oldest first. */
  monthKeys: string[]
}

const SIX_MONTHS = 6

const YEAR_CHOICES = 3

const MONTH_CHOICES = 12

export function periodWindow(period: ReportPeriod, todayIso: string): PeriodWindow {
  const thisMonth = monthKeyOfIso(todayIso)

  if (period.mode === 'year') {
    const year = Number(period.value) || isoToJalali(todayIso).year

    const all = Array.from({ length: 12 }, (_, index) => monthKeyFor(year, index + 1))

    return {
      title: toPersianDigits(String(year)),
      range: { start: monthRangeOf(all[0]).start, end: monthRangeOf(all[11]).end },
      // The months still to come have nothing to bill, collect or hold.
      monthKeys: all.filter(key => key <= thisMonth)
    }
  }

  if (period.mode === 'month') {
    const key = /^\d{4}-\d{2}$/.test(period.value) ? period.value : thisMonth

    return { title: monthLabel(key), range: monthRangeOf(key), monthKeys: [key] }
  }

  const monthKeys = recentMonthKeys(thisMonth, SIX_MONTHS)

  return {
    title: '۶ ماه اخیر',
    range: {
      start: monthRangeOf(monthKeys[0]).start,
      end: monthRangeOf(monthKeys[SIX_MONTHS - 1]).end
    },
    monthKeys
  }
}

/** What the period `Select` offers: the last years, or the last twelve months (newest first). */
export function periodChoices(
  mode: ReportMode,
  todayIso: string
): { value: string; label: string }[] {
  if (mode === 'year') {
    const year = isoToJalali(todayIso).year

    return Array.from({ length: YEAR_CHOICES }, (_, index) => {
      const value = String(year - index)

      return { value, label: toPersianDigits(value) }
    })
  }

  if (mode === 'month') {
    return recentMonthKeys(monthKeyOfIso(todayIso), MONTH_CHOICES)
      .reverse()
      .map(value => ({ value, label: monthLabel(value) }))
  }

  return []
}

/** The value a mode starts at when it is picked. */
export function defaultPeriodValue(mode: ReportMode, todayIso: string): string {
  return periodChoices(mode, todayIso)[0]?.value ?? ''
}

export interface CollectionMonth {
  monthKey: string
  label: string
  billed: number
  collected: number
}

/**
 * Billed against collected per month. Only the monthly charges (`charge:<unit>:<month>`) count:
 * previous debts, expense shares and unit credit (`credit:<unit>`) are other receivables and
 * never add to a month's «صدور» or «وصول».
 */
export function collectionByMonth(
  receivables: Receivable[],
  monthKeys: string[]
): CollectionMonth[] {
  return monthKeys.map(monthKey => {
    const card = chargeMonthCard(receivables, monthKey)

    return { monthKey, label: monthLabel(monthKey), billed: card.billed, collected: card.collected }
  })
}

/** «۹۱٪»: how much of what was billed came in; null when nothing was billed. */
export function collectionRate(months: CollectionMonth[]): number | null {
  const billed = months.reduce((sum, month) => sum + month.billed, 0)

  if (!billed) return null

  return Math.round((months.reduce((sum, month) => sum + month.collected, 0) / billed) * 100)
}

/** The paired-bar chart's rows: collected (first bar) against billed (second bar). */
export const collectionFlow = (months: CollectionMonth[]): MonthlyFlow[] =>
  months.map(month => ({
    monthKey: month.monthKey,
    label: month.label,
    income: month.collected,
    expense: month.billed,
    net: month.collected - month.billed
  }))

export interface KindAmount {
  value: string
  label: string
  amount: number
}

export interface PeriodFlow {
  income: number
  expense: number
  byCategory: CategorySummary[]
  byKind: KindAmount[]
}

const sumAmounts = (records: { values: Record<string, string> }[]) =>
  records.reduce((sum, record) => sum + parseNumeric(record.values.amount), 0)

/** What came in and went out in `range`, with the spending by category and by kind. */
export function periodFlow(
  income: FlowSide,
  expense: FlowSide,
  range: DateRange,
  kinds: ManagedItem[],
  payers: ManagedItem[]
): PeriodFlow {
  const spent = flowRecordsIn(expense, range)

  return {
    income: sumAmounts(flowRecordsIn(income, range)),
    expense: sumAmounts(spent),
    byCategory: sumByCategory(spent).filter(item => item.total > 0),
    byKind: expenseBreakdown(spent, kinds, payers).byKind.filter(item => item.amount > 0)
  }
}

export interface DebtorRow {
  unitId: string
  unitNumber: string
  name: string
  /** «مرداد» … the months with an open monthly charge. */
  months: string[]
  amount: number
  credit: number
}

export interface DebtorTable {
  rows: DebtorRow[]
  /** Open debt of the listed units; unit credit is never part of it. */
  total: number
  /** The credit the units hold, listed or not. */
  credit: number
}

/** The units that owe something, the largest debt first; credit rows are not receivables owed. */
export function debtorTable(rows: UnitRowData[], receivables: Receivable[]): DebtorTable {
  const owing = rows
    .filter(row => row.balance.open > 0)
    .map<DebtorRow>(row => ({
      unitId: row.unit.id,
      unitNumber: row.unit.number,
      name: row.resident?.name || row.owner || '—',
      months: row.balance.months.map(monthName),
      amount: row.balance.open,
      credit: row.balance.credit
    }))
    .sort(
      (a, b) =>
        b.amount - a.amount || a.unitNumber.localeCompare(b.unitNumber, 'fa', { numeric: true })
    )

  return {
    rows: owing,
    total: owing.reduce((sum, row) => sum + row.amount, 0),
    credit: creditsOf(receivables).reduce((sum, item) => sum + item.amount, 0)
  }
}

export interface FundPoint {
  monthKey: string
  label: string
  /** Sum of the accounts' balances at the end of the month; null before the first entry. */
  balance: number | null
}

/**
 * The fund at the end of each month from the wallet ledger: every account's last balance on or
 * before that day. `entries` are in the order they were written (oldest first).
 */
export function fundBalanceSeries(
  entries: LedgerEntry[],
  accountIds: string[],
  monthKeys: string[]
): FundPoint[] {
  const own = entries.filter(entry => accountIds.includes(entry.accountId))

  return monthKeys.map(monthKey => {
    const end = monthRangeOf(monthKey).end

    const last = new Map<string, number>()

    for (const entry of own) {
      if (entry.date.slice(0, 10) <= end) last.set(entry.accountId, entry.balanceAfter)
    }

    return {
      monthKey,
      label: monthLabel(monthKey),
      balance: last.size ? [...last.values()].reduce((sum, value) => sum + value, 0) : null
    }
  })
}

/** Ledger rows as written, ready for `fundBalanceSeries`. */
export const ledgerFromRows = (rows: string[][]): LedgerEntry[] =>
  rows.filter(row => String(row[0] ?? '').trim()).map(rowToLedgerEntry)

export interface OpenDebts {
  manager: number
  contractors: { name: string; amount: number }[]
  total: number
}

/** What the building still owes: to the manager, and to each contractor or member. */
export function openDebts(dangs: Dang[], managerNames: string[]): OpenDebts {
  const managers = new Set(managerNames.map(name => name.trim()).filter(Boolean))

  const others = new Map<string, number>()

  let manager = 0

  for (const item of dangs.filter(dang => !dang.paid)) {
    const name = item.counterparty.trim()

    if (managers.has(name)) manager += item.amount
    else others.set(name || '—', (others.get(name || '—') ?? 0) + item.amount)
  }

  const contractors = [...others]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  return {
    manager,
    contractors,
    total: manager + contractors.reduce((sum, item) => sum + item.amount, 0)
  }
}
