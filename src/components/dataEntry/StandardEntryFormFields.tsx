import { useMemo, type ReactNode } from 'react'
import type { useForm } from 'react-hook-form'

import EntryRecordExtraField from './EntryRecordExtraField'
import type { useVehicleExpenseEntry } from '../../hooks/useVehicleExpenseEntry'
import type { CustomForm, FieldConfig } from '../../types'
import { formFieldError } from '../../utils/formValidation'
import {
  COUNTERPARTY_FIELD_ID,
  FieldInput,
  FormRow,
  isFieldHidden,
  LINE_ITEMS_FIELD_ID,
  SUBCATEGORY_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID
} from '../form'
import { resolveCategoryType } from '../form/categorySelect/useCategorySelectActions'
import { readSubcategories } from '../form/categorySelect/useSubcategoryManager'
import type { FormControlWidth } from '../ui/formStyles'
import VehicleExpenseFields from '../vehicleExpenses/VehicleExpenseFields'

type EntryFieldRendererProps = {
  field: FieldConfig
  value: string | number
  formId: string
  controlWidth?: FormControlWidth
  error?: string
  parentCategory?: string
  hint?: string
  onChange: (value: string | number) => void
  onCategoriesChange: (categories: string[]) => void
}

function EntryFieldRenderer({
  field,
  value,
  formId,
  controlWidth,
  error,
  parentCategory,
  onChange,
  onCategoriesChange,
  hint
}: EntryFieldRendererProps) {
  return (
    <FieldInput
      field={field}
      value={value}
      onChange={onChange}
      formId={formId}
      controlWidth={controlWidth}
      error={error}
      parentCategory={parentCategory}
      onCategoriesChange={onCategoriesChange}
      hint={hint}
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
  vehicleExpense,
  clearFieldError,
  walletApplyHint,
  afterAmount,
  beforeAccount
}: {
  activeForm: CustomForm
  values: Record<string, string | number>
  errors: ReturnType<typeof useForm<Record<string, string | number>>>['formState']['errors']
  setValue: (id: string, value: string | number) => void
  onCategoriesRefresh: () => void
  showVehicleFields: boolean
  vehicleExpense: ReturnType<typeof useVehicleExpenseEntry>
  clearFieldError?: (fieldId: string) => void
  /** Why the balance switch starts unchecked (record opened from an SMS). */
  walletApplyHint?: string
  /** Rendered right under the date + amount row (the duplicate warning). */
  afterAmount?: ReactNode
  /** Rendered right before the account field (a building's kind and payer). */
  beforeAccount?: ReactNode
}) {
  const fieldById = useMemo(
    () => new Map(activeForm.fields.map(field => [field.id, field])),
    [activeForm.fields]
  )

  const selectedCategory = String(values.category ?? '')

  const categoryType = resolveCategoryType(undefined, activeForm.id)

  const hasSubcategories = readSubcategories(categoryType, selectedCategory).length > 0

  const handleCategoriesChange = (categories: string[]) => {
    onCategoriesRefresh()
    if (!categories.includes(selectedCategory)) {
      setValue('category', categories[0] ?? '')
    }
  }

  const renderField = (id: string, options?: { controlWidth?: FormControlWidth }) => {
    const field = fieldById.get(id)

    if (!field || isFieldHidden(field, values)) return null
    if (showVehicleFields && id === 'title') return null

    const vehicleFieldError =
      showVehicleFields && (id === 'amount' || id === 'date' || id === 'category')
        ? vehicleExpense.fieldErrors[id as keyof typeof vehicleExpense.fieldErrors] ||
          formFieldError(errors, field.id)
        : formFieldError(errors, field.id)

    return (
      <EntryFieldRenderer
        key={field.id}
        field={field}
        value={values[field.id] ?? ''}
        formId={activeForm.id}
        controlWidth={options?.controlWidth}
        error={vehicleFieldError}
        parentCategory={selectedCategory}
        hint={field.id === WALLET_APPLY_FIELD_ID ? walletApplyHint : undefined}
        onChange={next => {
          clearFieldError?.(field.id)
          setValue(field.id, next)
          if (field.id === 'category') setValue(SUBCATEGORY_FIELD_ID, '')
        }}
        onCategoriesChange={handleCategoriesChange}
      />
    )
  }

  // «طرف حساب» and «ریز اقلام» have their own editors; vehicle expenses keep neither.
  const renderExtraField = (id: string) =>
    fieldById.has(id) && !showVehicleFields ? (
      <EntryRecordExtraField
        key={id}
        fieldId={id}
        values={values}
        setValue={(fieldId, next) => {
          clearFieldError?.(fieldId)
          setValue(fieldId, next)
        }}
      />
    ) : null

  return (
    <>
      <FormRow>
        {renderField('date', { controlWidth: 'full' })}
        {renderField('amount', { controlWidth: 'full' })}
      </FormRow>
      {afterAmount}
      {renderField('title', { controlWidth: 'full' })}
      {renderField('category')}
      {!showVehicleFields && hasSubcategories ? renderField(SUBCATEGORY_FIELD_ID) : null}
      {showVehicleFields ? (
        <VehicleExpenseFields
          values={vehicleExpense.vehicleValues}
          amount={values.amount ?? ''}
          onChange={vehicleExpense.patchVehicleValues}
          vehicles={vehicleExpense.vehicles}
          expenseTypes={vehicleExpense.expenseTypes}
          onExpenseTypesChange={vehicleExpense.setExpenseTypes}
          errors={vehicleExpense.fieldErrors}
          renew={
            vehicleExpense.renewableService
              ? {
                  serviceType: vehicleExpense.renewableService.serviceType,
                  on: vehicleExpense.renewing
                }
              : undefined
          }
        />
      ) : null}
      {beforeAccount}
      {renderField(WALLET_ACCOUNT_FIELD_ID)}
      {renderField(WALLET_APPLY_FIELD_ID)}
      {renderExtraField(COUNTERPARTY_FIELD_ID)}
      {renderExtraField(LINE_ITEMS_FIELD_ID)}
      {renderField('note')}
    </>
  )
}
