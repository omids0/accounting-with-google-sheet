import { buildingEntryError } from './buildingExpenseEntry'
import type { CustomForm } from '../../types'
import { validatePositiveAmount } from '../../utils/formValidation'
import { SUBCATEGORY_FIELD_ID } from '../form'

export interface EntryValidationError {
  /** The field to mark; unset for a problem of the form as a whole. */
  id?: string
  message: string
}

/**
 * What stops a new entry from being saved: empty required fields, a non-positive amount and,
 * in a building, a manual split that does not add up. The vehicle branch checks its own fields.
 */
export function entryValidationErrors(
  form: CustomForm,
  values: Record<string, string | number>,
  context: {
    showVehicleFields: boolean
    selectedCategory: string
    hasSubcategories: boolean
    /** `false` (editing a saved record): only an empty amount blocks, a saved 0 stays editable. */
    strictAmount?: boolean
  }
): EntryValidationError[] {
  const { showVehicleFields, selectedCategory, hasSubcategories, strictAmount = true } = context
  const errors: EntryValidationError[] = []

  for (const field of form.fields) {
    if (!field.required) continue
    if (showVehicleFields && (field.id === 'title' || field.id === 'amount')) continue

    // The subcategory picker only exists once a category is chosen, and the
    // vehicle branch replaces it with its own fields.
    if (
      field.id === SUBCATEGORY_FIELD_ID &&
      (showVehicleFields || !selectedCategory || !hasSubcategories)
    ) {
      continue
    }

    const val = values[field.id]

    const isEmpty = val === '' || val === undefined || val === null

    const amountCheck =
      strictAmount && !isEmpty && field.id === 'amount' ? validatePositiveAmount(val) : true

    if (isEmpty || amountCheck !== true) {
      errors.push({
        id: field.id,
        message: amountCheck === true ? `«${field.label}» الزامی است` : amountCheck
      })
    }
  }

  const buildingError = buildingEntryError(form, values)

  if (buildingError) errors.push({ message: buildingError })

  return errors
}
