import { parseNumeric } from './parseNumeric'
import {
  LEGACY_VEHICLE_EXPENSE_CATEGORY,
  VEHICLE_EXPENSE_CATEGORY,
  VEHICLE_FUEL_EXPENSE_TYPE,
  VEHICLE_OTHER_OPTION
} from '../components/vehicles/constants'

export type VehicleExpenseFormValues = {
  vehicleId: string
  expenseType: string
  fuelPricePerLiter: string | number
  mileage: string | number
}

export function isVehicleExpenseCategory(category: string): boolean {
  const normalized = category.trim()

  return normalized === VEHICLE_EXPENSE_CATEGORY || normalized === LEGACY_VEHICLE_EXPENSE_CATEGORY
}

export function isFuelExpenseType(expenseType: string): boolean {
  return expenseType.trim() === VEHICLE_FUEL_EXPENSE_TYPE
}

/** Sheet cell value meaning «no expense type needs a mileage» (an empty cell means the default). */
const MILEAGE_REQUIRED_NONE = '-'

/** Expense types whose mileage is mandatory until the vehicle's profile says otherwise. */
export const DEFAULT_MILEAGE_REQUIRED_TYPES: readonly string[] = [VEHICLE_FUEL_EXPENSE_TYPE]

export function parseMileageRequiredTypes(cell: string | undefined): string[] {
  const text = String(cell ?? '').trim()

  if (!text) return [...DEFAULT_MILEAGE_REQUIRED_TYPES]
  if (text === MILEAGE_REQUIRED_NONE) return []

  return text
    .split('|')
    .map(item => item.trim())
    .filter(Boolean)
}

export function serializeMileageRequiredTypes(types: readonly string[]): string {
  const list = types.map(item => item.trim()).filter(Boolean)

  return list.length ? list.join('|') : MILEAGE_REQUIRED_NONE
}

/** Whether the vehicle's profile makes the mileage mandatory for this expense type. */
export function isMileageRequired(
  vehicle: { mileageRequiredTypes: readonly string[] } | undefined,
  expenseType: string
): boolean {
  const types = vehicle?.mileageRequiredTypes ?? DEFAULT_MILEAGE_REQUIRED_TYPES

  return types.includes(expenseType.trim())
}

export function calculateFuelLiters(amount: number, pricePerLiter: number): number {
  if (amount <= 0 || pricePerLiter <= 0) return 0

  return amount / pricePerLiter
}

export function buildVehicleExpenseTitle(
  expenseType: string,
  vehicleTitle?: string,
  isOtherVehicle = false
): string {
  if (isOtherVehicle || !vehicleTitle?.trim()) {
    return `${expenseType} — ${VEHICLE_OTHER_OPTION}`
  }

  return `${expenseType} — ${vehicleTitle.trim()}`
}

/** Form fields may hold Persian digits or separators, so reuse the shared parser. */
export function parseNumericField(value: string | number): number {
  return parseNumeric(value)
}
