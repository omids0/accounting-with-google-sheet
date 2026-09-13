import type { VehicleMileageReminderInterval } from '../../types/vehicles'

export const VEHICLE_EXPENSE_CATEGORY = 'خودرو'

export const VEHICLE_DEADLINE_CATEGORIES = [
  'بیمه شخص ثالث',
  'بیمه بدنه',
  'معاینه فنی',
  'عوارض خودرو',
  'سایر'
] as const

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
