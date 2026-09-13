import { saveCategoryGroupOnSheet } from './categories'
import { getDefaultSettings, getSettings, saveSettings } from './settings'

export const DEFAULT_VEHICLE_PERIODIC_CATEGORIES = [
  'روغن موتور',
  'فیلتر روغن',
  'فیلتر هوا',
  'فیلتر کابین',
  'شمع',
  'لنت ترمز',
  'تسمه تایم',
  'ضدیخ',
  'باتری',
  'لاستیک',
  'سایر'
]

export function getVehiclePeriodicCategories(): string[] {
  const stored = getSettings()?.vehiclePeriodicCategories

  return stored?.length ? stored : [...DEFAULT_VEHICLE_PERIODIC_CATEGORIES]
}

export function updateVehiclePeriodicCategories(categories: string[]): void {
  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({ ...settings, vehiclePeriodicCategories: categories })
}

export async function saveVehiclePeriodicCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  await saveCategoryGroupOnSheet(spreadsheetId, { vehiclePeriodic: categories })
  updateVehiclePeriodicCategories(categories)
}
