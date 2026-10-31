import { useEffect, type RefObject } from 'react'
import type { UseFormClearErrors, UseFormSetError } from 'react-hook-form'

import { entryValidationErrors } from './entryValidationErrors'
import type { useVehicleExpenseEntry } from '../../hooks/useVehicleExpenseEntry'
import type { CustomForm } from '../../types'
import { focusFirstInvalidField } from '../../utils/focusInvalidField'
import { showError } from '../../utils/toast'
import { parseNumericField } from '../../utils/vehicleExpenseUtils'

type FormValues = Record<string, string | number>

type Params = {
  activeForm: CustomForm
  formRef: RefObject<HTMLFormElement | null>
  vehicleExpense: ReturnType<typeof useVehicleExpenseEntry>
  showVehicleFields: boolean
  selectedCategory: string
  hasSubcategories: boolean
  setError: UseFormSetError<FormValues>
  clearErrors: UseFormClearErrors<FormValues>
}

/** Required-field and vehicle checks of the entry form: marks the fields, toasts the first. */
export function useEntryValidation({
  activeForm,
  formRef,
  vehicleExpense,
  showVehicleFields,
  selectedCategory,
  hasSubcategories,
  setError,
  clearErrors
}: Params) {
  return (formValues: FormValues) => {
    clearErrors()

    const found = entryValidationErrors(activeForm, formValues, {
      showVehicleFields,
      selectedCategory,
      hasSubcategories
    })

    found.forEach(error => error.id && setError(error.id, { message: error.message }))

    let hasError = found.length > 0
    let firstMessage: string | undefined = found[0]?.message

    if (showVehicleFields) {
      const vehicleErrors = vehicleExpense.validateVehicleExpense(
        String(formValues.category ?? ''),
        formValues.amount ?? ''
      )

      if (vehicleErrors) {
        firstMessage ??= Object.values(vehicleErrors).find(Boolean)
        hasError = true
      }
    }

    if (firstMessage) showError(firstMessage)
    if (hasError) focusFirstInvalidField(formRef.current)

    return !hasError
  }
}

/** A vehicle expense's amount error goes away as soon as the amount is a positive number. */
export function useClearAmountError(
  amount: string | number,
  showVehicleFields: boolean,
  vehicleExpense: ReturnType<typeof useVehicleExpenseEntry>,
  clearErrors: UseFormClearErrors<FormValues>
) {
  const { clearFieldError } = vehicleExpense

  useEffect(() => {
    if (!showVehicleFields) return

    if (parseNumericField(amount) > 0) {
      clearFieldError('amount')
      clearErrors('amount')
    }
  }, [amount, showVehicleFields, clearFieldError, clearErrors])
}
