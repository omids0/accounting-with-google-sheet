import { createUnitsWithOwners } from './buildingSetupActions'
import { updateUnit, type BuildingUnit, type UnitWithRow } from './buildingUnits'
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
