import { creditsOf, unitBalance } from './buildingCharges'
import { createUnitsWithOwners } from './buildingSetupActions'
import { updateUnit, type BuildingUnit, type UnitWithRow } from './buildingUnits'
import { fetchReceivables } from './receivablesCrud'
import type { Receivable } from '../types'
import { normalizeDigits } from '../utils/normalizeDigits'

/** The numbers and the note of the unit form (screen 18); `monthlyCharge` 0 = follows the method. */
export type UnitFormValues = Pick<
  BuildingUnit,
  'number' | 'floor' | 'area' | 'people' | 'parking' | 'storage' | 'monthlyCharge' | 'note'
>

/** Why the form cannot be saved yet, or null. The door number is the unit's identity in the list. */
export function validateUnitForm(
  values: UnitFormValues,
  units: Pick<UnitWithRow, 'id' | 'number' | 'active'>[],
  editingId?: string
): string | null {
  const number = normalizeDigits(values.number).trim()

  if (!number) return 'شمارهٔ واحد را وارد کن'

  const taken = units.some(unit => unit.active && unit.id !== editingId && unit.number === number)

  return taken ? `واحد ${values.number} قبلاً ثبت شده` : null
}

/**
 * Saves the unit form. A new unit also gets its placeholder owner (the same as the quick
 * builder); the people of an existing unit are changed with `changeResident`, not here.
 */
export async function saveUnit(
  spreadsheetId: string,
  values: UnitFormValues,
  editing: UnitWithRow | null
): Promise<void> {
  const next = { ...values, number: normalizeDigits(values.number).trim() }

  if (editing) await updateUnit(spreadsheetId, editing.rowNumber, { ...editing, ...next })
  else await createUnitsWithOwners(spreadsheetId, [next])
}

/** Why a unit cannot be archived (it still owes, or holds credit), or null. */
export function archiveBlocker(unitId: string, receivables: Receivable[]): string | null {
  const balance = unitBalance(unitId, receivables, creditsOf(receivables))

  if (balance.open > 0) return 'این واحد هنوز بدهی دارد؛ اول تسویه‌اش کن، بعد بایگانی کن'
  if (balance.credit !== 0) return 'این واحد اعتبار دارد؛ اول اعتبارش را تسویه کن، بعد بایگانی کن'

  return null
}

/**
 * Archives a unit (its «فعال» cell becomes «خیر») unless it still has an open balance, read
 * fresh from the sheet. Returns the reason it was refused, or null once it is written.
 */
export async function archiveUnit(
  spreadsheetId: string,
  unit: UnitWithRow
): Promise<string | null> {
  const blocker = archiveBlocker(unit.id, await fetchReceivables(spreadsheetId))

  if (blocker) return blocker

  await updateUnit(spreadsheetId, unit.rowNumber, { ...unit, active: false })

  return null
}

/**
 * Brings an archived unit back into charges, splits and counts. Refused while another active
 * unit has the same door number (the number is the unit's identity in the list).
 */
export async function restoreUnit(
  spreadsheetId: string,
  unit: UnitWithRow,
  units: Pick<UnitWithRow, 'id' | 'number' | 'active'>[]
): Promise<string | null> {
  const problem = validateUnitForm({ ...unit }, units, unit.id)

  if (problem) return problem

  await updateUnit(spreadsheetId, unit.rowNumber, { ...unit, active: true })

  return null
}
