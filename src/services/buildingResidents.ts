import type { ChargeResident } from './buildingCharges'
import { getCounterpartyFullName } from './counterparties'
import { BUILDING_RESIDENTS_HEADERS } from './sheetHeaders'
import { BUILDING_RESIDENTS_SHEET } from './sheetNames'
import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows, updateSheetRow } from './sheets'
import { RESIDENT_ROLES, type ResidentRole } from '../components/buildings/buildingOptions'
import type { Counterparty } from '../types'
import { getTodayIso } from '../utils/jalaliDate'

/**
 * One person's stay in one unit («ساکنان»): a row per person per stay. An owner's stay stays open
 * for as long as they own the unit; a tenant's closes with an exit date. Step 3 builds
 * `changeResident` on top of these.
 */
export interface UnitStay {
  id: string
  createdAt: string
  unitId: string
  personId: string
  role: ResidentRole
  from: string
  to: string
  active: boolean
}

export type StayWithRow = UnitStay & { rowNumber: number }

export function newStay(
  fields: Pick<UnitStay, 'unitId' | 'personId' | 'role'> & Partial<UnitStay>
): UnitStay {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    from: getTodayIso(),
    to: '',
    active: true,
    ...fields
  }
}

export function stayToRow(stay: UnitStay): string[] {
  return [
    stay.id,
    stay.createdAt,
    stay.unitId,
    stay.personId,
    stay.role,
    stay.from,
    stay.to,
    stay.active ? 'بله' : 'خیر'
  ]
}

export function rowToStay(row: string[], rowNumber: number): StayWithRow | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  const role = String(row[4] ?? '').trim()

  return {
    rowNumber,
    id,
    createdAt: row[1] ?? '',
    unitId: String(row[2] ?? '').trim(),
    personId: String(row[3] ?? '').trim(),
    role: RESIDENT_ROLES.find(item => item.value === role)?.value ?? 'owner',
    from: row[5] ?? '',
    to: row[6] ?? '',
    active: String(row[7] ?? '').trim() !== 'خیر'
  }
}

export function parseStays(rows: string[][]): StayWithRow[] {
  return rows
    .map((row, index) => rowToStay(row, index + 2))
    .filter((stay): stay is StayWithRow => stay !== null)
}

export async function fetchStays(spreadsheetId: string): Promise<StayWithRow[]> {
  await ensureSheetWithHeaders(spreadsheetId, BUILDING_RESIDENTS_SHEET, BUILDING_RESIDENTS_HEADERS)

  return parseStays(await fetchSheetRows(spreadsheetId, BUILDING_RESIDENTS_SHEET))
}

export async function createStays(spreadsheetId: string, stays: UnitStay[]): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, BUILDING_RESIDENTS_SHEET, BUILDING_RESIDENTS_HEADERS)

  for (const stay of stays) {
    await appendSheetRow(spreadsheetId, BUILDING_RESIDENTS_SHEET, stayToRow(stay))
  }
}

export async function updateStay(
  spreadsheetId: string,
  rowNumber: number,
  stay: UnitStay
): Promise<void> {
  await updateSheetRow(spreadsheetId, BUILDING_RESIDENTS_SHEET, rowNumber, stayToRow(stay))
}

/** The open stay of a role in a unit (the first one if a sheet edited by hand has two). */
function openStay<T extends UnitStay>(stays: T[], unitId: string, role: ResidentRole): T | null {
  return stays.find(s => s.unitId === unitId && s.role === role && s.active && !s.to) ?? null
}

export const currentOwner = <T extends UnitStay>(unitId: string, stays: T[]) =>
  openStay(stays, unitId, 'owner')

/** Who lives there: the tenant if there is one, else the owner (null when the unit has neither). */
export function currentResident<T extends UnitStay>(unitId: string, stays: T[]): T | null {
  return openStay(stays, unitId, 'tenant') ?? openStay(stays, unitId, 'owner')
}

/** The stays with the names to bill, for `chargeDebtor`; a stay whose person is gone is left out. */
export function chargeResidents(stays: UnitStay[], persons: Counterparty[]): ChargeResident[] {
  const byId = new Map(persons.map(person => [person.id, person]))

  return stays.flatMap(stay => {
    const person = byId.get(stay.personId)

    return person
      ? [
          {
            unitId: stay.unitId,
            personId: stay.personId,
            name: getCounterpartyFullName(person),
            role: stay.role,
            current: stay.active && !stay.to
          }
        ]
      : []
  })
}
