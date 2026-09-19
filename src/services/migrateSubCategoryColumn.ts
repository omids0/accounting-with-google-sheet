import { CATEGORIES_SHEET } from './categories'
import { getSettings } from './settings'
import { writeSheetHeaders } from './sheetsEnsure'
import { normalizeHeaderLabel } from './sheetsHeaders'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'
import { SUBCATEGORY_FIELD_LABEL } from '../components/form/fieldUtils'

const MIGRATION_STORAGE_KEY = 'accounting_subcategory_column_migration'

type MigrationState = Record<string, true>

function isMigrated(spreadsheetId: string): boolean {
  return Boolean((getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {})[spreadsheetId])
}

function markMigrated(spreadsheetId: string): void {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })
}

async function appendHeaderColumn(
  spreadsheetId: string,
  sheetName: string,
  label: string
): Promise<void> {
  const rows = getSheetAllRows(spreadsheetId, sheetName) ?? []

  const allRows = rows.length ? rows : await fetchSheetRangeFromApi(spreadsheetId, sheetName)

  const header = (allRows[0] ?? []).map(cell => String(cell ?? ''))

  if (!header.some(cell => cell.trim())) return
  if (header.some(cell => normalizeHeaderLabel(cell) === label)) return

  const nextHeader = [...header, label]

  await writeSheetHeaders(spreadsheetId, sheetName, nextHeader)
  setSheetAllRows(spreadsheetId, sheetName, [nextHeader, ...allRows.slice(1)])
}

/** Adds the «زیردسته» column to income/expense sheets and to the categories sheet. */
export async function migrateSubCategoryColumn(spreadsheetId: string): Promise<void> {
  if (!spreadsheetId || isMigrated(spreadsheetId)) return

  const forms = (getSettings()?.forms ?? []).filter(
    form => form.type === 'income' || form.type === 'expense'
  )

  for (const form of forms) {
    await appendHeaderColumn(spreadsheetId, form.sheetName, SUBCATEGORY_FIELD_LABEL)
  }

  await appendHeaderColumn(spreadsheetId, CATEGORIES_SHEET, SUBCATEGORY_FIELD_LABEL)

  markMigrated(spreadsheetId)
}
