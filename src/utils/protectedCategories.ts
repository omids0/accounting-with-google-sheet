import { withOtherLast } from './categoryOrdering'
import {
  VEHICLE_EXPENSE_CATEGORY,
  VEHICLE_FUEL_EXPENSE_TYPE
} from '../components/vehicles/constants'
import { CHECK_EXPENSE_CATEGORY } from '../services/checks'
import { INSTALLMENT_EXPENSE_CATEGORY } from '../services/installmentsConstants'

/** Category of the record that closes a wallet reconciliation gap. */
export const RECONCILIATION_CATEGORY = 'اصلاح موجودی'

export const LOCKED_INCOME_CATEGORIES = new Set<string>([RECONCILIATION_CATEGORY])

// Installments and checks write their linked expense record under these exact
// category names (see installmentsCrud.ts and checks.ts). Renaming or deleting
// the category would not touch those hardcoded writes, so payments would keep
// landing under a category the picker no longer offers — same failure mode
// «خودرو» and «اصلاح موجودی» are locked against.
export const LOCKED_EXPENSE_CATEGORIES = new Set<string>([
  VEHICLE_EXPENSE_CATEGORY,
  RECONCILIATION_CATEGORY,
  INSTALLMENT_EXPENSE_CATEGORY,
  CHECK_EXPENSE_CATEGORY
])

export const LOCKED_VEHICLE_EXPENSE_TYPES = new Set<string>([VEHICLE_FUEL_EXPENSE_TYPE])

export function isLockedExpenseCategory(category: string): boolean {
  return LOCKED_EXPENSE_CATEGORIES.has(category.trim())
}

export function isLockedVehicleExpenseType(expenseType: string): boolean {
  return LOCKED_VEHICLE_EXPENSE_TYPES.has(expenseType.trim())
}

/** Transfers between accounts and into savings goals (round 6 default list). */
export const TRANSFER_EXPENSE_CATEGORY = 'انتقال'

/** Income of a received payment on a receivable (see receivables/utils.ts). */
export const RECEIVABLE_INCOME_CATEGORY = 'طلب'

// «سیستمی» on the category page: no rename, no delete. Unlike the locked sets these
// are not forced into a list that lacks them — older spreadsheets stay as they are.
const SYSTEM_ONLY_CATEGORIES = {
  expense: [TRANSFER_EXPENSE_CATEGORY],
  income: [RECEIVABLE_INCOME_CATEGORY]
}

/** Categories of the form type that cannot be renamed or deleted. */
export function lockedCategoriesFor(formType: 'income' | 'expense'): string[] {
  const locked = formType === 'expense' ? LOCKED_EXPENSE_CATEGORIES : LOCKED_INCOME_CATEGORIES

  return [...locked, ...SYSTEM_ONLY_CATEGORIES[formType]]
}

export function isSystemCategory(formType: string, category: string): boolean {
  if (formType !== 'income' && formType !== 'expense') return false

  return lockedCategoriesFor(formType).includes(category.trim())
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
