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

export function parseNumericField(value: string | number): number {
  if (value === '' || value === undefined || value === null) return 0

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}
