import { saveCategoryGroupOnSheet } from './categories'
import { getDefaultSettings, getSettings, saveSettings } from './settings'

export const DEFAULT_VEHICLE_DEADLINE_CATEGORIES = [
  'بیمه شخص ثالث',
  'بیمه بدنه',
  'معاینه فنی',
  'عوارض خودرو',
  'سایر'
]

export function getVehicleDeadlineCategories(): string[] {
  const stored = getSettings()?.vehicleDeadlineCategories

  return stored?.length ? stored : [...DEFAULT_VEHICLE_DEADLINE_CATEGORIES]
}

export function updateVehicleDeadlineCategories(categories: string[]): void {
  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({ ...settings, vehicleDeadlineCategories: categories })
}

export async function saveVehicleDeadlineCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  await saveCategoryGroupOnSheet(spreadsheetId, { vehicleDeadline: categories })
  updateVehicleDeadlineCategories(categories)
}
