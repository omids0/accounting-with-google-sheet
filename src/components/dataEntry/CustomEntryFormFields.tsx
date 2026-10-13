import type { ReactNode } from 'react'
import type { useForm } from 'react-hook-form'

import type { useVehicleExpenseEntry } from '../../hooks/useVehicleExpenseEntry'
import type { CustomForm } from '../../types'
import { formFieldError } from '../../utils/formValidation'
import { FieldInput, isFieldHidden, sortFormFields, SUBCATEGORY_FIELD_ID } from '../form'
import EntryRecordExtraField, { isRecordExtraField } from './EntryRecordExtraField'
import VehicleExpenseFields from '../vehicleExpenses/VehicleExpenseFields'

/** Fields of a form that is not the standard income/expense layout, in their own order. */
export default function CustomEntryFormFields({
  activeForm,
  values,
  errors,
  setValue,
  clearAmountError,
  showVehicleFields,
  hasSubcategories,
  vehicleExpense,
  selectedCategory,
  onCategoriesChange,
  afterAmount
}: {
  activeForm: CustomForm
  values: Record<string, string | number>
  errors: ReturnType<typeof useForm<Record<string, string | number>>>['formState']['errors']
  setValue: (id: string, value: string | number) => void
  clearAmountError: () => void
  showVehicleFields: boolean
  hasSubcategories: boolean
  vehicleExpense: ReturnType<typeof useVehicleExpenseEntry>
  selectedCategory: string
  onCategoriesChange: (categories: string[]) => void
  /** Rendered right under the amount (the duplicate warning). */
  afterAmount?: ReactNode
}) {
  return (
    <>
      {sortFormFields(activeForm.fields).map(field => {
        if (isFieldHidden(field, values)) return null
        if (showVehicleFields && field.id === 'title') return null
        if (field.id === SUBCATEGORY_FIELD_ID && (showVehicleFields || !hasSubcategories)) {
          return null
        }

        if (isRecordExtraField(field.id)) {
          return showVehicleFields ? null : (
            <EntryRecordExtraField
              key={field.id}
              fieldId={field.id}
              values={values}
              setValue={setValue}
            />
          )
        }

        const fieldError =
          showVehicleFields && field.id === 'amount'
            ? vehicleExpense.fieldErrors.amount || formFieldError(errors, field.id)
            : formFieldError(errors, field.id)

        const input = (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id] ?? ''}
            onChange={next => {
              if (showVehicleFields && field.id === 'amount') clearAmountError()
              setValue(field.id, next)
              if (field.id === 'category') setValue(SUBCATEGORY_FIELD_ID, '')
            }}
            formId={activeForm.id}
            error={fieldError}
            parentCategory={selectedCategory}
            onCategoriesChange={onCategoriesChange}
          />
        )

        return field.id === 'amount' && afterAmount ? (
          <div key={field.id}>
            {input}
            {afterAmount}
          </div>
        ) : (
          input
        )
      })}

      {showVehicleFields ? (
        <VehicleExpenseFields
          values={vehicleExpense.vehicleValues}
          amount={values.amount ?? ''}
          onChange={vehicleExpense.patchVehicleValues}
          vehicles={vehicleExpense.vehicles}
          expenseTypes={vehicleExpense.expenseTypes}
          onExpenseTypesChange={vehicleExpense.setExpenseTypes}
          errors={vehicleExpense.fieldErrors}
        />
      ) : null}
    </>
  )
}
