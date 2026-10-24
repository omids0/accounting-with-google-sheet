import type { BuildingProfile } from './buildingTemplate'
import { getSettings } from './settings'
import { BUILDING_SHEET } from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'
import { CHARGE_METHODS, VACANCY_RULES } from '../components/buildings/buildingOptions'
import { parseNumeric } from '../utils/parseNumeric'

function day(raw: string | undefined, fallback: number): number {
  const value = Math.trunc(parseNumeric(raw))

  return value >= 1 && value <= 28 ? value : fallback
}

/** The one row of «ساختمان»; a value an older sheet does not know falls back to the default. */
export function parseBuildingProfile(row: string[] | undefined): BuildingProfile | null {
  if (!row || !String(row[0] ?? '').trim()) return null

  const method = String(row[4] ?? '').trim()
  const vacancy = String(row[7] ?? '').trim()

  return {
    name: String(row[0]).trim(),
    address: String(row[1] ?? '').trim(),
    floors: Math.max(1, Math.trunc(parseNumeric(row[2])) || 1),
    defaultCharge: parseNumeric(row[3]),
    chargeMethod: CHARGE_METHODS.find(item => item.value === method)?.value ?? 'fixed',
    issueDay: day(row[5], 1),
    dueDay: day(row[6], 10),
    vacancyRule: VACANCY_RULES.find(item => item.value === vacancy)?.value ?? 'full'
  }
}

/** The profile of the active (or given) building as its mirror has it. */
export function getBuildingProfile(
  spreadsheetId = getSettings()?.spreadsheetId ?? ''
): BuildingProfile | null {
  return parseBuildingProfile(getSheetDataRows(spreadsheetId, BUILDING_SHEET)?.[0])
}
