import { MANAGER_PAYER, type ManagedItem } from '../../services/buildingLists'
import { monthKeyOfIso } from '../../services/buildingMonths'
import { EXPENSE_KIND_FIELD_ID, PAYER_FIELD_ID } from '../form/buildingFields'

type Row = { values: Record<string, string> }

/** One chip of the expenses page: everything, one kind, or what the manager paid out of pocket. */
export type ExpenseChip = 'all' | `kind:${string}` | 'manager'

export interface ExpenseFilter {
  /** Jalali `YYYY-MM`. */
  month: string
  chip: ExpenseChip
  category: string
}

export const ALL_CATEGORIES = 'all'

/** Newest month first; the current month is always offered, even before its first expense. */
export function expenseMonths(records: Row[], dateFieldId: string, currentMonth: string): string[] {
  const months = new Set<string>([currentMonth])

  for (const record of records) {
    const date = record.values[dateFieldId]

    if (date) months.add(monthKeyOfIso(date))
  }

  return [...months].sort().reverse()
}

/** The chips: «همه», each visible kind, then «از جیب مدیر». */
export function expenseChips(kinds: ManagedItem[]): { value: ExpenseChip; label: string }[] {
  return [
    { value: 'all', label: 'همه' },
    ...kinds
      .filter(kind => !kind.hidden)
      .map(kind => ({ value: `kind:${kind.value}` as ExpenseChip, label: kind.label })),
    { value: 'manager', label: 'از جیب مدیر' }
  ]
}

/** The month's expense records (before the chip and category), for the hero and the month totals. */
export function expensesOfMonth<T extends Row>(
  records: T[],
  dateFieldId: string,
  month: string
): T[] {
  return records.filter(record => {
    const date = record.values[dateFieldId]

    return !!date && monthKeyOfIso(date) === month
  })
}

export function filterExpenses<T extends Row>(
  records: T[],
  filter: ExpenseFilter,
  dateFieldId: string
): T[] {
  return expensesOfMonth(records, dateFieldId, filter.month).filter(record => {
    const { chip, category } = filter

    if (category !== ALL_CATEGORIES && record.values.category !== category) return false
    if (chip === 'manager') return record.values[PAYER_FIELD_ID] === MANAGER_PAYER
    if (chip.startsWith('kind:')) return record.values[EXPENSE_KIND_FIELD_ID] === chip.slice(5)

    return true
  })
}
