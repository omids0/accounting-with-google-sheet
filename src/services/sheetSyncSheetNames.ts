import type { AppSettings } from '../types'
import { getSettings } from './settings'
import {
  ACTIVITY_LOG_SHEET,
  BUDGETS_SHEET,
  BUILDING_RESIDENTS_SHEET,
  BUILDING_SHEET,
  BUILDING_UNITS_SHEET,
  CATEGORIES_SHEET,
  CHECKS_SHEET,
  COUNTERPARTIES_SHEET,
  DANG_SHEET,
  DANG_SPLIT_ALLOCATIONS_SHEET,
  DANG_SPLIT_CATEGORIES_SHEET,
  DANG_SPLIT_EXPENSES_SHEET,
  DANG_SPLIT_GROUPS_SHEET,
  DANG_SPLIT_PEOPLE_SHEET,
  INSTALLMENTS_SHEET,
  MONTHLY_BALANCE_SHEET,
  NET_WORTH_SHEET,
  PERIOD_SETTINGS_SHEET,
  PERSONAL_ONLY_SHEETS,
  PERSONAL_REMINDERS_SHEET,
  PUSH_SUBS_SHEET,
  RECEIVABLES_SHEET,
  RECURRING_SHEET,
  REMINDERS_SHEET,
  SHARED_ACCOUNT_SHEETS,
  SMS_TEMPLATES_SHEET,
  TIMESHEETS_SHEET,
  TIMESHEET_ENTRIES_SHEET,
  TRANSFERS_SHEET,
  TREASURY_ASSETS_SHEET,
  TREASURY_GOALS_SHEET,
  TREASURY_SHEET,
  VEHICLES_SHEET,
  VEHICLE_DEADLINE_SHEET,
  VEHICLE_EXPENSE_META_SHEET,
  VEHICLE_HISTORY_SHEET,
  VEHICLE_MECHANIC_SHEET,
  VEHICLE_PERIODIC_SHEET,
  WALLET_LEDGER_SHEET,
  WALLET_SHEET
} from './sheetNames'
import { workspaceTypeOf, type WorkspaceType } from './workspace'

/** Sheets every account has, regardless of which custom forms it defines. */
const STATIC_SHEETS = [
  INSTALLMENTS_SHEET,
  DANG_SHEET,
  DANG_SPLIT_GROUPS_SHEET,
  DANG_SPLIT_CATEGORIES_SHEET,
  DANG_SPLIT_PEOPLE_SHEET,
  DANG_SPLIT_EXPENSES_SHEET,
  DANG_SPLIT_ALLOCATIONS_SHEET,
  CHECKS_SHEET,
  COUNTERPARTIES_SHEET,
  RECEIVABLES_SHEET,
  TREASURY_SHEET,
  TREASURY_ASSETS_SHEET,
  TREASURY_GOALS_SHEET,
  WALLET_SHEET,
  WALLET_LEDGER_SHEET,
  TRANSFERS_SHEET,
  SMS_TEMPLATES_SHEET,
  BUDGETS_SHEET,
  RECURRING_SHEET,
  CATEGORIES_SHEET,
  MONTHLY_BALANCE_SHEET,
  NET_WORTH_SHEET,
  PERIOD_SETTINGS_SHEET,
  REMINDERS_SHEET,
  PERSONAL_REMINDERS_SHEET,
  PUSH_SUBS_SHEET,
  TIMESHEETS_SHEET,
  TIMESHEET_ENTRIES_SHEET,
  VEHICLES_SHEET,
  VEHICLE_PERIODIC_SHEET,
  VEHICLE_DEADLINE_SHEET,
  VEHICLE_HISTORY_SHEET,
  VEHICLE_MECHANIC_SHEET,
  VEHICLE_EXPENSE_META_SHEET,
  ACTIVITY_LOG_SHEET
]

/** Only a building spreadsheet has these; a personal one is never asked for them. */
const BUILDING_SHEETS = [BUILDING_SHEET, BUILDING_UNITS_SHEET, BUILDING_RESIDENTS_SHEET]

function staticSheetsFor(type: WorkspaceType): readonly string[] {
  // A shared account has only the few tabs its engine needs, never a personal or building one.
  if (type === 'shared') return SHARED_ACCOUNT_SHEETS
  if (type !== 'building') return STATIC_SHEETS

  return [...STATIC_SHEETS.filter(name => !PERSONAL_ONLY_SHEETS.includes(name)), ...BUILDING_SHEETS]
}

/**
 * The tabs a sync downloads for `spreadsheetId` (default: the active one): the account forms, the
 * static tabs and, for a building only, the building tabs instead of the personal-only ones.
 */
export function getKnownSheetNames(
  settings: AppSettings = getSettings()!,
  spreadsheetId?: string
): string[] {
  const statics = staticSheetsFor(workspaceTypeOf(spreadsheetId))

  if (!settings) return [...statics]

  const formSheets = settings.forms.map(form => form.sheetName)

  return [...new Set([...formSheets, ...statics])]
}
