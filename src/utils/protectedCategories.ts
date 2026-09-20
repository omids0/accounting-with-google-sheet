import { withOtherLast } from './categoryOrdering'
import {
  VEHICLE_EXPENSE_CATEGORY,
  VEHICLE_FUEL_EXPENSE_TYPE
} from '../components/vehicles/constants'

/** Category of the record that closes a wallet reconciliation gap. */
export const RECONCILIATION_CATEGORY = 'اصلاح موجودی'

export const LOCKED_INCOME_CATEGORIES = new Set<string>([RECONCILIATION_CATEGORY])

export const LOCKED_EXPENSE_CATEGORIES = new Set<string>([
  VEHICLE_EXPENSE_CATEGORY,
  RECONCILIATION_CATEGORY
])

export const LOCKED_VEHICLE_EXPENSE_TYPES = new Set<string>([VEHICLE_FUEL_EXPENSE_TYPE])

export function isLockedExpenseCategory(category: string): boolean {
  return LOCKED_EXPENSE_CATEGORIES.has(category.trim())
}

export function isLockedVehicleExpenseType(expenseType: string): boolean {
  return LOCKED_VEHICLE_EXPENSE_TYPES.has(expenseType.trim())
}

export function lockedCategoriesFor(formType: 'income' | 'expense'): string[] {
  return formType === 'expense' ? [...LOCKED_EXPENSE_CATEGORIES] : [...LOCKED_INCOME_CATEGORIES]
}

function withLocked(categories: string[], locked: Iterable<string>): string[] {
  const next = categories.filter(Boolean)

  for (const category of locked) {
    if (!next.includes(category)) next.push(category)
  }

  return withOtherLast(next)
}

export function withLockedExpenseCategories(categories: string[]): string[] {
  return withLocked(categories, LOCKED_EXPENSE_CATEGORIES)
}

export function withLockedIncomeCategories(categories: string[]): string[] {
  return withLocked(categories, LOCKED_INCOME_CATEGORIES)
}

export function withLockedFormCategories(
  formType: 'income' | 'expense',
  categories: string[]
): string[] {
  return formType === 'expense'
    ? withLockedExpenseCategories(categories)
    : withLockedIncomeCategories(categories)
}

export function withLockedVehicleExpenseTypes(categories: string[]): string[] {
  const next = categories.filter(Boolean)
  const locked = [...LOCKED_VEHICLE_EXPENSE_TYPES]

  for (const category of locked) {
    if (!next.includes(category)) next.unshift(category)
  }

  return withOtherLast(next)
}
