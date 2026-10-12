import type { CategorySummary, CustomForm, MonthlyFlow, MonthlyPoint } from '../types'
import {
  buildJalaliMonthKey,
  formatJalaliMonthLabel,
  getJalaliMonthKey,
  getJalaliMonthRange,
  getJalaliYearRange,
  isDateInRange
} from '../utils/dateRange'
import type { DateRange } from '../utils/dateRange'
import { getJalaliParts } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

export function getDateFieldId(form: CustomForm | undefined): string {
  return form?.fields.find(f => f.type === 'date')?.id ?? 'date'
}

export function filterByDateRange<T extends { values: Record<string, string> }>(
  records: T[],
  range: DateRange,
  dateFieldId: string
): T[] {
  return records.filter(r => isDateInRange(r.values[dateFieldId] ?? '', range))
}

type SheetRecord = { values: Record<string, string> }

function addMonthTotals(
  totals: Map<string, { income: number; expense: number }>,
  records: SheetRecord[],
  dateField: string,
  range: DateRange,
  key: 'income' | 'expense'
) {
  for (const record of records) {
    const date = normalizeSheetDate(record.values[dateField] ?? '')

    if (!date || !isDateInRange(date, range)) continue

    const monthKey = getJalaliMonthKey(date)

    const entry = totals.get(monthKey) ?? { income: 0, expense: 0 }

    entry[key] += parseNumeric(record.values.amount)
    totals.set(monthKey, entry)
  }
}

/** Income, expense and net for each of `monthKeys` (in the given order), zero when empty. */
export function aggregateMonthlyFlowForKeys(
  monthKeys: string[],
  incomeRecords: SheetRecord[],
  expenseRecords: SheetRecord[],
  incomeDateField: string,
  expenseDateField: string,
  /** Narrows the months' own span (e.g. the current year stops at today). */
  clamp?: DateRange
): MonthlyFlow[] {
  const first = getJalaliMonthRange(monthKeys[0] ?? '')
  const last = getJalaliMonthRange(monthKeys[monthKeys.length - 1] ?? '')

  if (!first || !last) return []

  const range = clamp ?? { start: first.start, end: last.end }

  const totals = new Map<string, { income: number; expense: number }>()

  addMonthTotals(totals, incomeRecords, incomeDateField, range, 'income')
  addMonthTotals(totals, expenseRecords, expenseDateField, range, 'expense')

  return monthKeys.map(monthKey => {
    const { income = 0, expense = 0 } = totals.get(monthKey) ?? {}

    return {
      monthKey,
      label: formatJalaliMonthLabel(monthKey),
      income,
      expense,
      net: income - expense
    }
  })
}

export function aggregateYearToDateMonthlyFlow(
  year: number,
  incomeRecords: SheetRecord[],
  expenseRecords: SheetRecord[],
  incomeDateField: string,
  expenseDateField: string
): MonthlyFlow[] {
  const { year: currentYear, month: currentMonth } = getJalaliParts(new Date())

  const maxMonth = year < currentYear ? 12 : year === currentYear ? currentMonth : 0

  const monthKeys = Array.from({ length: maxMonth }, (_, index) =>
    buildJalaliMonthKey(year, index + 1)
  )

  return aggregateMonthlyFlowForKeys(
    monthKeys,
    incomeRecords,
    expenseRecords,
    incomeDateField,
    expenseDateField,
    getJalaliYearRange(year)
  )
}

/**
 * Running total of the monthly net: what the months of the window added to (or
 * took from) your money together, starting from zero before the first month.
 */
export function cumulativeNetSeries(flow: MonthlyFlow[]): MonthlyPoint[] {
  let running = 0

  return flow.map(item => {
    running += item.net

    return { monthKey: item.monthKey, label: item.label, value: running }
  })
}

export function sumByCategory(
  records: { values: Record<string, string> }[],
  amountKey = 'amount',
  categoryKey = 'category'
): CategorySummary[] {
  const map = new Map<string, number>()

  for (const r of records) {
    const amount = parseNumeric(r.values[amountKey])

    const cat = r.values[categoryKey] || 'سایر'

    map.set(cat, (map.get(cat) ?? 0) + amount)
  }

  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}
