import { countWalletAccounts } from './onboarding'
import { DEFAULT_RULES, parseReminderRows } from './reminders'
import { getSettings } from './settings'
import {
  CHECKS_SHEET,
  COUNTERPARTIES_SHEET,
  DANG_SHEET,
  RECEIVABLES_SHEET,
  REMINDERS_SHEET,
  VEHICLES_SHEET
} from './sheetNames'
import { getSheetAllRows, getSheetDataRows } from './spreadsheetStore'
import type { VehicleExpenseInput } from './vehicleExpenseActions'
import { COUNTERPARTY_FIELD_LABEL } from '../components/form/fieldUtils'
import { VEHICLE_OTHER_OPTION } from '../components/vehicles/constants'

/**
 * Deterministic triggers for contextual suggestions: exact field values read from the
 * local sheet mirror, never guesses from free text.
 */
export type NudgeSignalId = 'vehicle-expense' | 'check-reminder' | 'counterparty' | 'record-account'

export interface NudgeSignal {
  id: NudgeSignalId
  targetHasData: boolean
}

export const NO_ACCOUNT_STREAK = 10

export const COUNTERPARTY_REPEAT = 3

/** Sheets whose «طرف حساب» column a typed name is counted in, with that column's index. */
const COUNTERPARTY_COLUMNS: [string, number][] = [
  [CHECKS_SHEET, 3],
  [DANG_SHEET, 4],
  [RECEIVABLES_SHEET, 3]
]

const clean = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')

const dataRows = (spreadsheetId: string, sheet: string) =>
  (getSheetDataRows(spreadsheetId, sheet) ?? []).filter(row => row.some(cell => clean(cell)))

/**
 * The income/expense record tabs, each with the column its header calls «طرف حساب»;
 * a tab without that column (an older sheet) is left out.
 */
function recordCounterpartySources(spreadsheetId: string): [string[][], number][] {
  const forms = getSettings()?.forms ?? []

  return forms
    .filter(form => form.type === 'income' || form.type === 'expense')
    .flatMap((form): [string[][], number][] => {
      const rows = getSheetAllRows(spreadsheetId, form.sheetName) ?? []

      const column = (rows[0] ?? []).findIndex(cell => clean(cell) === COUNTERPARTY_FIELD_LABEL)

      return column < 0
        ? []
        : [[rows.slice(1).filter(row => row.some(cell => clean(cell))), column]]
    })
}

export function countNameUses(name: string, sources: [string[][], number][]): number {
  const target = clean(name)

  return sources.reduce(
    (total, [rows, column]) => total + rows.filter(row => clean(row[column]) === target).length,
    0
  )
}

export function counterpartyNames(rows: string[][]): Set<string> {
  return new Set(rows.map(row => clean(`${row[2] ?? ''} ${row[3] ?? ''}`)))
}

export function isChecksReminderOn(rows: string[][]): boolean {
  const saved = parseReminderRows(rows).find(rule => rule.kind === 'checks')

  return (saved ?? DEFAULT_RULES.find(rule => rule.kind === 'checks'))?.enabled ?? true
}

/** Expense in «خودرو» booked against «سایر»; the target is the vehicles tab. */
export function detectVehicleExpense(spreadsheetId: string, vehicleId: string): NudgeSignal | null {
  if (vehicleId !== VEHICLE_OTHER_OPTION) return null

  return {
    id: 'vehicle-expense',
    targetHasData: dataRows(spreadsheetId, VEHICLES_SHEET).length > 0
  }
}

/** The very first check; the target is the checks reminder rule. */
export function detectFirstCheck(spreadsheetId: string): NudgeSignal | null {
  if (dataRows(spreadsheetId, CHECKS_SHEET).length !== 1) return null

  const rules = getSheetDataRows(spreadsheetId, REMINDERS_SHEET)

  return { id: 'check-reminder', targetHasData: !rules || isChecksReminderOn(rules) }
}

/** A name typed for the third time in checks, dang, receivables or the «طرف حساب» of a record. */
export function detectRepeatedCounterparty(
  spreadsheetId: string,
  name: string
): NudgeSignal | null {
  if (!clean(name)) return null

  const sources = [
    ...COUNTERPARTY_COLUMNS.map(([sheet, column]): [string[][], number] => [
      dataRows(spreadsheetId, sheet),
      column
    ]),
    ...recordCounterpartySources(spreadsheetId)
  ]

  if (countNameUses(name, sources) < COUNTERPARTY_REPEAT) return null

  const known = counterpartyNames(dataRows(spreadsheetId, COUNTERPARTIES_SHEET))

  return { id: 'counterparty', targetHasData: known.has(clean(name)) }
}

/** Ten records in a row without an account, while the wallet has at least one. */
export function detectMissingAccounts(spreadsheetId: string, streak: number): NudgeSignal | null {
  if (streak < NO_ACCOUNT_STREAK || !countWalletAccounts(spreadsheetId)) return null

  return { id: 'record-account', targetHasData: false }
}

/** What «وصل کن به خودرو» hands to the vehicles page. */
export interface VehicleExpenseLink {
  recordId: string
  input: VehicleExpenseInput
}
