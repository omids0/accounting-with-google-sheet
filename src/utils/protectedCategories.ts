import {
  VEHICLE_EXPENSE_CATEGORY,
  VEHICLE_FUEL_EXPENSE_TYPE
} from '../components/vehicles/constants'

export const LOCKED_EXPENSE_CATEGORIES = new Set<string>([VEHICLE_EXPENSE_CATEGORY])

export const LOCKED_VEHICLE_EXPENSE_TYPES = new Set<string>([VEHICLE_FUEL_EXPENSE_TYPE])

export function isLockedExpenseCategory(category: string): boolean {
  return LOCKED_EXPENSE_CATEGORIES.has(category.trim())
}

export function isLockedVehicleExpenseType(expenseType: string): boolean {
  return LOCKED_VEHICLE_EXPENSE_TYPES.has(expenseType.trim())
}

export function withLockedExpenseCategories(categories: string[]): string[] {
  const next = categories.filter(Boolean)
  const locked = [...LOCKED_EXPENSE_CATEGORIES]

  for (const category of locked) {
    if (!next.includes(category)) next.push(category)
  }

  return next
}

export function withLockedVehicleExpenseTypes(categories: string[]): string[] {
  const next = categories.filter(Boolean)
  const locked = [...LOCKED_VEHICLE_EXPENSE_TYPES]

  for (const category of locked) {
    if (!next.includes(category)) next.unshift(category)
  }

  return next
}
