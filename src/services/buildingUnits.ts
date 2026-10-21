import { BUILDING_UNITS_HEADERS } from './sheetHeaders'
import { BUILDING_UNITS_SHEET } from './sheetNames'
import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows, updateSheetRow } from './sheets'
import { OCCUPANCY, type Occupancy } from '../components/buildings/buildingOptions'
import { normalizeDigits } from '../utils/normalizeDigits'
import { parseNumeric } from '../utils/parseNumeric'

/**
 * A unit of a building workspace («واحدها»). `monthlyCharge` 0 = follows the building's charge
 * method; anything else is this unit's own amount. Step 3 adds the page and the edit flow.
 */
export interface BuildingUnit {
  id: string
  createdAt: string
  number: string
  floor: number
  area: number
  people: number
  parking: number
  storage: number
  monthlyCharge: number
  active: boolean
  note: string
  occupancy: Occupancy
}

export type UnitWithRow = BuildingUnit & { rowNumber: number }

export function newUnit(
  fields: Partial<BuildingUnit> & Pick<BuildingUnit, 'number'>,
  createdAt = new Date().toLocaleString('fa-IR')
): BuildingUnit {
  return {
    id: crypto.randomUUID(),
    createdAt,
    floor: 0,
    area: 0,
    people: 0,
    parking: 0,
    storage: 0,
    monthlyCharge: 0,
    active: true,
    note: '',
    occupancy: 'owner-resident',
    ...fields
  }
}

export function unitToRow(unit: BuildingUnit): string[] {
  return [
    unit.id,
    unit.createdAt,
    unit.number,
    String(unit.floor),
    String(unit.area),
    String(unit.people),
    String(unit.parking),
    String(unit.storage),
    String(unit.monthlyCharge),
    unit.active ? 'بله' : 'خیر',
    unit.note,
    unit.occupancy
  ]
}

export function rowToUnit(row: string[], rowNumber: number): UnitWithRow | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  const occupancy = String(row[11] ?? '').trim()

  return {
    rowNumber,
    id,
    createdAt: row[1] ?? '',
    number: normalizeDigits(String(row[2] ?? '')).trim(),
    floor: parseNumeric(row[3]),
    area: parseNumeric(row[4]),
    people: parseNumeric(row[5]),
    parking: parseNumeric(row[6]),
    storage: parseNumeric(row[7]),
    monthlyCharge: parseNumeric(row[8]),
    // A blank cell (a hand-added row) counts as active.
    active: String(row[9] ?? '').trim() !== 'خیر',
    note: row[10] ?? '',
    occupancy: OCCUPANCY.find(item => item.value === occupancy)?.value ?? 'owner-resident'
  }
}

/** Units in door-number order («۲» before «۱۰»). */
export function sortUnits<T extends Pick<BuildingUnit, 'number'>>(units: T[]): T[] {
  return [...units].sort((a, b) =>
    a.number.localeCompare(b.number, 'fa', { numeric: true, sensitivity: 'base' })
  )
}

/** The units that take part in charges, splits, SMS matching and counts; archived ones do not. */
export function activeUnits<T extends Pick<BuildingUnit, 'active'>>(units: T[]): T[] {
  return units.filter(unit => unit.active)
}

export function parseUnits(rows: string[][]): UnitWithRow[] {
  return rows
    .map((row, index) => rowToUnit(row, index + 2))
    .filter((unit): unit is UnitWithRow => unit !== null)
}

export async function fetchUnits(spreadsheetId: string): Promise<UnitWithRow[]> {
  await ensureSheetWithHeaders(spreadsheetId, BUILDING_UNITS_SHEET, BUILDING_UNITS_HEADERS)

  return sortUnits(parseUnits(await fetchSheetRows(spreadsheetId, BUILDING_UNITS_SHEET)))
}

/** Appends the units one after another; the outbox sends consecutive appends as one batch. */
export async function createUnits(spreadsheetId: string, units: BuildingUnit[]): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, BUILDING_UNITS_SHEET, BUILDING_UNITS_HEADERS)

  for (const unit of units) {
    await appendSheetRow(spreadsheetId, BUILDING_UNITS_SHEET, unitToRow(unit))
  }
}

export async function updateUnit(
  spreadsheetId: string,
  rowNumber: number,
  unit: BuildingUnit
): Promise<void> {
  await updateSheetRow(spreadsheetId, BUILDING_UNITS_SHEET, rowNumber, unitToRow(unit))
}
