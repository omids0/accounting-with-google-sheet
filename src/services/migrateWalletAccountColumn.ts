import { appendHeaderColumn } from './migrateSubCategoryColumn'
import { getSettings } from './settings'
import { getItem, setItem } from './storage'
import { WALLET_ACCOUNT_FIELD_LABEL } from '../components/form/fieldUtils'

const MIGRATION_STORAGE_KEY = 'accounting_wallet_account_column_migration_v1'

type MigrationState = Record<string, true>

/** Adds the «حساب» column to the income/expense sheets of spreadsheets created before it. */
export async function migrateWalletAccountColumn(spreadsheetId: string): Promise<void> {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  if (!spreadsheetId || state[spreadsheetId]) return

  const forms = (getSettings()?.forms ?? []).filter(
    form => form.type === 'income' || form.type === 'expense'
  )

  for (const form of forms) {
    await appendHeaderColumn(spreadsheetId, form.sheetName, WALLET_ACCOUNT_FIELD_LABEL)
  }

  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })
}
