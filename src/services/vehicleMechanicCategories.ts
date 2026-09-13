import { saveCategoryGroupOnSheet } from './categories'
import { getDefaultSettings, getSettings, saveSettings } from './settings'

export const DEFAULT_VEHICLE_MECHANIC_CATEGORIES = [
  'لاستیک',
  'جلو بندی',
  'رینگ',
  'فنر',
  'ترمز',
  'برق',
  'بدنه',
  'سایر'
]

export function getVehicleMechanicCategories(): string[] {
  const stored = getSettings()?.vehicleMechanicCategories

  return stored?.length ? stored : [...DEFAULT_VEHICLE_MECHANIC_CATEGORIES]
}

export function updateVehicleMechanicCategories(categories: string[]): void {
  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({ ...settings, vehicleMechanicCategories: categories })
}

export async function saveVehicleMechanicCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  await saveCategoryGroupOnSheet(spreadsheetId, { vehicleMechanic: categories })
  updateVehicleMechanicCategories(categories)
}
