import { useMemo } from 'react'
import type { useForm } from 'react-hook-form'

import type { useVehicleExpenseEntry } from '../../hooks/useVehicleExpenseEntry'
import type { CustomForm, FieldConfig } from '../../types'
import { formFieldError } from '../../utils/formValidation'
import { FieldInput, FormRow } from '../form'
import type { FormControlWidth } from '../ui/formStyles'
import VehicleExpenseFields from '../vehicleExpenses/VehicleExpenseFields'

type EntryFieldRendererProps = {
  field: FieldConfig
  value: string | number
  formId: string
  controlWidth?: FormControlWidth
  error?: string
  onChange: (value: string | number) => void
  onCategoriesChange: (categories: string[]) => void
}

function EntryFieldRenderer({
  field,
  value,
  formId,
  controlWidth,
  error,
  onChange,
  onCategoriesChange
}: EntryFieldRendererProps) {
  return (
    <FieldInput
      field={field}
      value={value}
      onChange={onChange}
      formId={formId}
      controlWidth={controlWidth}
      error={error}
      onCategoriesChange={onCategoriesChange}
    />
  )
}

export default function StandardEntryFormFields({
  activeForm,
  values,
  errors,
  setValue,
  onCategoriesRefresh,
  showVehicleFields,
  vehicleExpense
}: {
  activeForm: CustomForm
  values: Record<string, string | number>
  errors: ReturnType<typeof useForm<Record<string, string | number>>>['formState']['errors']
  setValue: (id: string, value: string | number) => void
  onCategoriesRefresh: () => void
  showVehicleFields: boolean
  vehicleExpense: ReturnType<typeof useVehicleExpenseEntry>
}) {
  const fieldById = useMemo(
    () => new Map(activeForm.fields.map(field => [field.id, field])),
    [activeForm.fields]
  )

  const handleCategoriesChange = (categories: string[]) => {
    onCategoriesRefresh()
    if (!categories.includes(String(values.category ?? ''))) {
      setValue('category', categories[0] ?? '')
    }
  }

  const renderField = (id: string, options?: { controlWidth?: FormControlWidth }) => {
    const field = fieldById.get(id)

    if (!field) return null
    if (showVehicleFields && id === 'title') return null

    return (
      <EntryFieldRenderer
        key={field.id}
        field={field}
        value={values[field.id] ?? ''}
        formId={activeForm.id}
        controlWidth={options?.controlWidth}
        error={formFieldError(errors, field.id)}
        onChange={next => setValue(field.id, next)}
        onCategoriesChange={handleCategoriesChange}
      />
    )
  }

  return (
    <>
      <FormRow>
        {renderField('date', { controlWidth: 'full' })}
        {renderField('amount', { controlWidth: 'full' })}
      </FormRow>
      {renderField('title', { controlWidth: 'full' })}
      {renderField('category')}
      {showVehicleFields ? (
        <VehicleExpenseFields
          values={vehicleExpense.vehicleValues}
          amount={values.amount ?? ''}
          onChange={vehicleExpense.patchVehicleValues}
          vehicles={vehicleExpense.vehicles}
          expenseTypes={vehicleExpense.expenseTypes}
          onExpenseTypesChange={vehicleExpense.setExpenseTypes}
        />
      ) : null}
      {renderField('note')}
    </>
  )
}
