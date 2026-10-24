import { isNonFlowCategory } from '../../services/buildingDashboard'
import { MANAGER_PAYER, type ManagedItem } from '../../services/buildingLists'
import { monthKeyOfIso } from '../../services/buildingMonths'
import { parseNumeric } from '../../utils/parseNumeric'
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

const inMonth = <T extends Row>(records: T[], dateFieldId: string, month: string): T[] =>
  records.filter(record => {
    const date = record.values[dateFieldId]

    return !!date && monthKeyOfIso(date) === month
  })

/**
 * The month's real expense records (before the chip and category), for the hero, the list and the
 * month totals. Transfers («انتقال», e.g. repaying the manager) and fund corrections («اصلاح
 * موجودی») are not spending: same rule as the dashboard card and the reports (`flowRecordsIn`).
 */
export const expensesOfMonth = <T extends Row>(
  records: T[],
  dateFieldId: string,
  month: string
): T[] =>
  inMonth(records, dateFieldId, month).filter(record => !isNonFlowCategory(record.values.category))

/** The month's transfers and corrections: not expenses, shown as a separate line under the total. */
export const nonFlowTotalOfMonth = (records: Row[], dateFieldId: string, month: string): number =>
  inMonth(records, dateFieldId, month)
    .filter(record => isNonFlowCategory(record.values.category))
    .reduce((sum, record) => sum + parseNumeric(record.values.amount), 0)

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
