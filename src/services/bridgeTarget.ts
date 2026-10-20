import { getBuildingProfile } from './buildingProfile'
import { getSettings, getSpreadsheets } from './settings'
import { getSpreadsheetLabel } from './spreadsheetCatalog'
import { personalSpreadsheet } from './workspace'

/**
 * The manager's own spreadsheet when a bridge can write to it: it exists on this device and is not
 * the open one (a bridge is only offered from inside a building).
 */
export function personalBridgeId(): string | null {
  const personal = personalSpreadsheet(getSpreadsheets())

  return personal && personal.id !== getSettings()?.spreadsheetId ? personal.id : null
}

/** The open building as the personal sheet names it: «ساختمان نرگس» (its spreadsheet's label). */
export function activeBuildingName(): string {
  const entry = getSpreadsheets().find(item => item.id === getSettings()?.spreadsheetId)

  if (entry) return getSpreadsheetLabel(entry.name)

  const name = getBuildingProfile()?.name

  return name ? `ساختمان ${name}` : ''
}

/**
 * Bridge B applies to a unit whose current debtor is the manager's own person: the counterparty
 * flagged «من» (`me`). A unit nobody pays for, or a resident who is somebody else, never does.
 */
export function isManagerDebtor(
  debtor: { id: string } | null,
  persons: { id: string; me?: boolean }[]
): boolean {
  return Boolean(debtor && persons.find(person => person.id === debtor.id)?.me)
}
