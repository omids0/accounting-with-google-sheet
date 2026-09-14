import { saveCategoryGroupOnSheet } from './categories'
import { getDefaultSettings, getSettings, saveSettings } from './settings'
import { withLockedVehicleExpenseTypes } from '../utils/protectedCategories'

export const DEFAULT_VEHICLE_EXPENSE_CATEGORIES = [
  'بنزین',
  'پارکینگ',
  'عوارض',
  'کارواش',
  'تعمیرات جزئی',
  'سایر'
]

export function getVehicleExpenseCategories(): string[] {
  const stored = getSettings()?.vehicleExpenseCategories

  const base = stored?.length ? stored : [...DEFAULT_VEHICLE_EXPENSE_CATEGORIES]

  return withLockedVehicleExpenseTypes(base)
}

export function updateVehicleExpenseCategories(categories: string[]): void {
  const settings = getSettings() ?? getDefaultSettings()

  saveSettings({
    ...settings,
    vehicleExpenseCategories: withLockedVehicleExpenseTypes(categories)
  })
}

export async function saveVehicleExpenseCategoriesToSheet(
  spreadsheetId: string,
  categories: string[]
): Promise<void> {
  const next = withLockedVehicleExpenseTypes(categories)

  await saveCategoryGroupOnSheet(spreadsheetId, { vehicleExpense: next })
  updateVehicleExpenseCategories(next)
}
