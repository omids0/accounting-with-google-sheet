import { saveFormCategoriesToSheet } from './categories'
import { getSettings } from './settings'
import { fetchRecords, updateRecord } from './sheets'
import { getItem, setItem } from './storage'
import {
  createVehicleExpenseMeta,
  ensureVehicleExpenseMetaSheet,
  findVehicleExpenseMetaByRecordId
} from './vehicleExpenseRecords'
import { ensureVehicleExpenseCategory } from './vehicleExpenses'
import {
  LEGACY_VEHICLE_EXPENSE_CATEGORY,
  VEHICLE_EXPENSE_CATEGORY,
  VEHICLE_OTHER_OPTION
} from '../components/vehicles/constants'
import { withLockedExpenseCategories } from '../utils/protectedCategories'

const MIGRATION_STORAGE_KEY = 'accounting_machine_category_migration'

type MigrationState = Record<string, true>

function getMigrationState(): MigrationState {
  return getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}
}

function isMigrated(spreadsheetId: string): boolean {
  return Boolean(getMigrationState()[spreadsheetId])
}

function markMigrated(spreadsheetId: string): void {
  const state = getMigrationState()

  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })
}

export function isLegacyMachineExpenseCategory(category: string): boolean {
  return category.trim() === LEGACY_VEHICLE_EXPENSE_CATEGORY
}

export function removeLegacyMachineCategory(categories: string[]): string[] {
  const next = categories.filter(category => !isLegacyMachineExpenseCategory(category))

  return withLockedExpenseCategories(next)
}

export async function migrateLegacyMachineExpenseCategory(
  spreadsheetId: string
): Promise<{ migratedRecords: number }> {
  if (!spreadsheetId || isMigrated(spreadsheetId)) {
    return { migratedRecords: 0 }
  }

  const settings = getSettings()
  const expenseForm = settings?.forms.find(form => form.type === 'expense')

  if (!expenseForm) {
    markMigrated(spreadsheetId)

    return { migratedRecords: 0 }
  }

  await ensureVehicleExpenseMetaSheet(spreadsheetId)
  await ensureVehicleExpenseCategory()

  const records = await fetchRecords(spreadsheetId, expenseForm)
  const legacyRecords = records.filter(record =>
    isLegacyMachineExpenseCategory(String(record.values.category ?? ''))
  )

  for (const record of legacyRecords) {
    await updateRecord(spreadsheetId, expenseForm, record.rowNumber, record.id, record.createdAt, {
      ...record.values,
      category: VEHICLE_EXPENSE_CATEGORY
    })

    const existingMeta = await findVehicleExpenseMetaByRecordId(spreadsheetId, record.id)

    if (!existingMeta) {
      await createVehicleExpenseMeta(spreadsheetId, {
        expenseRecordId: record.id,
        vehicleId: '',
        expenseType: VEHICLE_OTHER_OPTION,
        fuelPricePerLiter: 0,
        fuelLiters: 0,
        mileage: 0
      })
    }
  }

  const categoryOptions =
    expenseForm.fields.find(field => field.id === 'category')?.options ??
    getSettings()
      ?.forms.find(form => form.id === expenseForm.id)
      ?.fields.find(field => field.id === 'category')?.options ??
    []

  if (categoryOptions.some(option => isLegacyMachineExpenseCategory(option))) {
    await saveFormCategoriesToSheet(
      spreadsheetId,
      expenseForm.id,
      removeLegacyMachineCategory(categoryOptions)
    )
  }

  markMigrated(spreadsheetId)

  return { migratedRecords: legacyRecords.length }
}
