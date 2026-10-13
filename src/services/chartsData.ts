import type {
  AppSettings,
  CategoryShare,
  MonthlyFlow,
  MonthlyPoint,
  PreviousMonthSummary
} from '../types'
import {
  aggregateMonthlyFlowForKeys,
  aggregateYearToDateMonthlyFlow,
  cumulativeNetSeries,
  filterByDateRange,
  getDateFieldId,
  sumByCategory
} from './dashboardAggregation'
import { summarizePreviousMonth } from './monthComparison'
import { fetchRecords } from './sheets'
import { toCategoryShares } from '../utils/categoryShares'
import {
  getJalaliMonthRange,
  getJalaliYearRange,
  listRecentJalaliMonthKeys,
  type DateRange
} from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'

export type ChartsPeriodMode = 'month' | 'year'

/** A month (`1405-07`) or a year (`1405`), depending on the mode. */
export interface ChartsPeriod {
  mode: ChartsPeriodMode
  key: string
}

/** Months shown by the trend charts in month mode. */
export const CHARTS_TREND_MONTHS = 6

export interface ChartsData {
  totalIncome: number
  totalExpense: number
  incomeByCategory: CategoryShare[]
  expenseByCategory: CategoryShare[]
  /** Income and expense per month of the trend window. */
  flow: MonthlyFlow[]
  /** Running sum of the monthly net over the same window. */
  cumulative: MonthlyPoint[]
  /** Month mode only: the month before, for the category comparison. */
  previousMonth?: PreviousMonthSummary
}

type SheetRecord = { values: Record<string, string> }

export interface ChartsRecords {
  incomeRecords: SheetRecord[]
  expenseRecords: SheetRecord[]
  incomeDateField: string
  expenseDateField: string
}

/** Category range of a period; the current month or year stops at today. */
export function chartsRangeFor(period: ChartsPeriod, todayIso: string = getTodayIso()): DateRange {
  if (period.mode === 'year') return getJalaliYearRange(Number(period.key))

  const range = getJalaliMonthRange(period.key) ?? { start: todayIso, end: todayIso }

  return range.end > todayIso ? { start: range.start, end: todayIso } : range
}

/** The six months ending at `monthKey`; records after `endIso` (the future) are left out. */
function monthWindowFlow(records: ChartsRecords, monthKey: string, endIso: string): MonthlyFlow[] {
  const keys = listRecentJalaliMonthKeys(monthKey, CHARTS_TREND_MONTHS)
  const start = getJalaliMonthRange(keys[0] ?? '')?.start ?? endIso

  return aggregateMonthlyFlowForKeys(
    keys,
    records.incomeRecords,
    records.expenseRecords,
    records.incomeDateField,
    records.expenseDateField,
    { start, end: endIso }
  )
}

export function buildChartsData(
  records: ChartsRecords,
  period: ChartsPeriod,
  todayIso: string = getTodayIso()
): ChartsData {
  const { incomeRecords, expenseRecords, incomeDateField, expenseDateField } = records
  const range = chartsRangeFor(period, todayIso)
  const income = filterByDateRange(incomeRecords, range, incomeDateField)
  const expense = filterByDateRange(expenseRecords, range, expenseDateField)

  const flow =
    period.mode === 'year'
      ? aggregateYearToDateMonthlyFlow(
          Number(period.key),
          incomeRecords,
          expenseRecords,
          incomeDateField,
          expenseDateField
        )
      : monthWindowFlow(records, period.key, range.end)

  return {
    totalIncome: income.reduce((sum, record) => sum + parseNumeric(record.values.amount), 0),
    totalExpense: expense.reduce((sum, record) => sum + parseNumeric(record.values.amount), 0),
    incomeByCategory: toCategoryShares(sumByCategory(income)),
    expenseByCategory: toCategoryShares(sumByCategory(expense)),
    flow,
    cumulative: cumulativeNetSeries(flow),
    previousMonth: period.mode === 'month' ? summarizePreviousMonth(records, period.key) : undefined
  }
}

export async function loadChartsData(
  settings: AppSettings,
  period: ChartsPeriod
): Promise<ChartsData> {
  const incomeForm = settings.forms.find(form => form.type === 'income')
  const expenseForm = settings.forms.find(form => form.type === 'expense')

  const [incomeRecords, expenseRecords] = await Promise.all([
    incomeForm ? fetchRecords(settings.spreadsheetId, incomeForm) : Promise.resolve([]),
    expenseForm ? fetchRecords(settings.spreadsheetId, expenseForm) : Promise.resolve([])
  ])

  return buildChartsData(
    {
      incomeRecords,
      expenseRecords,
      incomeDateField: getDateFieldId(incomeForm),
      expenseDateField: getDateFieldId(expenseForm)
    },
    period
  )
}
