import type { AppSettings } from '../types'
import { CATEGORIES_SHEET } from './categories'
import { CHECKS_SHEET } from './checks'
import { COUNTERPARTIES_SHEET } from './counterparties'
import { DANG_SHEET } from './dang'
import { INSTALLMENTS_SHEET } from './installments'
import { MONTHLY_BALANCE_SHEET } from './monthlyBalance'
import { PERIOD_SETTINGS_SHEET } from './periodSettings'
import { PERSONAL_REMINDERS_SHEET } from './personalReminders'
import { RECEIVABLES_SHEET } from './receivables'
import { REMINDERS_SHEET, PUSH_SUBS_SHEET } from './reminders'
import { getSettings } from './settings'
import { TIMESHEETS_SHEET, TIMESHEET_ENTRIES_SHEET } from './timesheet'
import { TREASURY_SHEET } from './treasury'
import { WALLET_SHEET } from './wallet'

/** Sheets every account has, regardless of which custom forms it defines. */
const STATIC_SHEETS = [
  INSTALLMENTS_SHEET,
  DANG_SHEET,
  CHECKS_SHEET,
  COUNTERPARTIES_SHEET,
  RECEIVABLES_SHEET,
  TREASURY_SHEET,
  WALLET_SHEET,
  CATEGORIES_SHEET,
  MONTHLY_BALANCE_SHEET,
  PERIOD_SETTINGS_SHEET,
  REMINDERS_SHEET,
  PERSONAL_REMINDERS_SHEET,
  PUSH_SUBS_SHEET,
  TIMESHEETS_SHEET,
  TIMESHEET_ENTRIES_SHEET
]

export function getKnownSheetNames(settings: AppSettings = getSettings()!): string[] {
  if (!settings) return [...STATIC_SHEETS]

  const formSheets = settings.forms.map(form => form.sheetName)

  return [...new Set([...formSheets, ...STATIC_SHEETS])]
}
