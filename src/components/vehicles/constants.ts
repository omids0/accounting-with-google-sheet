import type { VehicleMileageReminderInterval } from '../../types/vehicles'

export const VEHICLE_EXPENSE_CATEGORY = 'خودرو'

/** @deprecated Legacy expense category merged into {@link VEHICLE_EXPENSE_CATEGORY}. */
export const LEGACY_VEHICLE_EXPENSE_CATEGORY = 'ماشین'

export const VEHICLE_FUEL_EXPENSE_TYPE = 'بنزین'

export const VEHICLE_OTHER_OPTION = 'سایر'

export { DEFAULT_VEHICLE_DEADLINE_CATEGORIES as VEHICLE_DEADLINE_CATEGORIES } from '../../services/vehicleDeadlineCategories'

export { DEFAULT_VEHICLE_MECHANIC_CATEGORIES as VEHICLE_MECHANIC_CATEGORIES } from '../../services/vehicleMechanicCategories'

export const VEHICLE_MILEAGE_REMINDER_OPTIONS: {
  value: VehicleMileageReminderInterval
  label: string
}[] = [
  { value: 'first-of-month', label: 'اول هر ماه شمسی' },
  { value: 'every-2-months', label: 'هر ۲ ماه' },
  { value: 'every-3-months', label: 'هر ۳ ماه' },
  { value: 'every-6-months', label: 'هر ۶ ماه' },
  { value: 'yearly', label: 'هر سال' },
  { value: 'weekly', label: 'هر هفته' },
  { value: 'biweekly', label: 'هر ۲ هفته' },
  { value: 'triweekly', label: 'هر ۳ هفته' },
  { value: 'daily', label: 'هر روز' },
  { value: 'every-3-days', label: 'هر ۳ روز' },
  { value: 'every-10-days', label: 'هر ۱۰ روز' }
]

export function getMileageReminderLabel(interval: VehicleMileageReminderInterval): string {
  return (
    VEHICLE_MILEAGE_REMINDER_OPTIONS.find(option => option.value === interval)?.label ?? interval
  )
}
