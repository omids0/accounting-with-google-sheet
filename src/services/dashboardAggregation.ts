import type { CategorySummary, CustomForm, MonthlyFlow } from '../types'
import {
  formatJalaliMonthLabel,
  getJalaliMonthKey,
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

export function aggregateYearToDateMonthlyFlow(
  year: number,
  incomeRecords: { values: Record<string, string> }[],
  expenseRecords: { values: Record<string, string> }[],
  incomeDateField: string,
  expenseDateField: string
): MonthlyFlow[] {
  const range = getJalaliYearRange(year)

  const totals = new Map<string, { income: number; expense: number }>()

  for (const record of incomeRecords) {
    const date = normalizeSheetDate(record.values[incomeDateField] ?? '')

    if (!date || !isDateInRange(date, range)) continue

    const monthKey = getJalaliMonthKey(date)

    const entry = totals.get(monthKey) ?? { income: 0, expense: 0 }

    entry.income += parseNumeric(record.values.amount)
    totals.set(monthKey, entry)
  }

  for (const record of expenseRecords) {
    const date = normalizeSheetDate(record.values[expenseDateField] ?? '')

    if (!date || !isDateInRange(date, range)) continue

    const monthKey = getJalaliMonthKey(date)

    const entry = totals.get(monthKey) ?? { income: 0, expense: 0 }

    entry.expense += parseNumeric(record.values.amount)
    totals.set(monthKey, entry)
  }

  const { year: currentYear, month: currentMonth } = getJalaliParts(new Date())

  const maxMonth = year < currentYear ? 12 : year === currentYear ? currentMonth : 0

  const flow: MonthlyFlow[] = []

  for (let month = 1; month <= maxMonth; month += 1) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`

    const { income = 0, expense = 0 } = totals.get(monthKey) ?? {}

    flow.push({
      monthKey,
      label: formatJalaliMonthLabel(monthKey),
      income,
      expense,
      net: income - expense
    })
  }

  return flow
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
