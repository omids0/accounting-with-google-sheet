import { getSettings } from '../../services/settings'
import type { FieldConfig } from '../../types'
import { lockedCategoriesFor } from '../../utils/protectedCategories'
import AmountInput from '../AmountInput'
import JalaliDatePicker from '../JalaliDatePicker'
import CategorySelect from './CategorySelect'
import { resolveCategoryType } from './categorySelect/useCategorySelectActions'
import { SUBCATEGORY_FIELD_ID } from './fieldUtils'
import FormField from './FormField'
import Select from './Select'
import SubCategorySelect from './SubCategorySelect'
import { getAccountingStartDate } from '../../services/accountingStartDate'
import type { FormControlWidth } from '../ui/formStyles'
import { formFieldNoteClass } from '../ui/recordsStyles'

interface FieldInputProps {
  field: FieldConfig
  value: string | number
  onChange: (value: string | number) => void
  formId?: string
  onCategoriesChange?: (categories: string[]) => void
  controlWidth?: FormControlWidth
  error?: string
  /** Selected category, for the subcategory field. */
  parentCategory?: string
}

function fieldPlaceholder(field: FieldConfig): string | undefined {
  if (field.id === 'note') return 'توضیحات اضافه...'
  if (field.id === 'amount') return '۰'
  if (field.type === 'text') return `مثلاً: ${field.label}`

  return undefined
}

function defaultControlWidth(field: FieldConfig): FormControlWidth {
  if (field.id === 'note' || field.id === 'category') return 'full'
  if (field.id === 'amount') return 'standard'
  if (field.type === 'date') return 'compact'
  if (field.type === 'select') return 'full'

  return 'standard'
}

export default function FieldInput({
  field,
  value,
  onChange,
  formId,
  onCategoriesChange,
  controlWidth,
  error,
  parentCategory
}: FieldInputProps) {
  const placeholder = fieldPlaceholder(field)
  const resolvedWidth = controlWidth ?? defaultControlWidth(field)

  const control = (() => {
    if (field.type === 'text' && field.id === 'note') {
      return (
        <textarea
          rows={4}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )
    }

    if (field.type === 'text') {
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )
    }

    if (field.type === 'number' && field.id === 'amount') {
      return <AmountInput value={value ?? ''} onChange={onChange} invalid={Boolean(error)} />
    }

    if (field.type === 'number') {
      return (
        <input
          type="number"
          inputMode="decimal"
          value={value === '' ? '' : value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          dir="ltr"
          placeholder={placeholder}
        />
      )
    }

    if (field.type === 'date') {
      return (
        <JalaliDatePicker
          value={String(value ?? '')}
          onChange={iso => onChange(iso)}
          invalid={Boolean(error)}
          minIso={getAccountingStartDate() || undefined}
        />
      )
    }

    if (field.type === 'select' && field.id === 'category' && formId) {
      const formType = getSettings()?.forms.find(form => form.id === formId)?.type
      const lockedCategories =
        formType === 'income' || formType === 'expense' ? lockedCategoriesFor(formType) : undefined

      return (
        <CategorySelect
          value={String(value ?? '')}
          onChange={next => onChange(next)}
          categories={field.options ?? []}
          formId={formId}
          onCategoriesChange={onCategoriesChange}
          lockedCategories={lockedCategories}
          allowSubcategories
          aria-label={field.label}
          invalid={Boolean(error)}
        />
      )
    }

    if (field.id === SUBCATEGORY_FIELD_ID && formId) {
      const categoryType = resolveCategoryType(undefined, formId)

      if (!categoryType || !parentCategory) return null

      return (
        <SubCategorySelect
          value={String(value ?? '')}
          onChange={next => onChange(next)}
          categoryType={categoryType}
          category={parentCategory}
          aria-label={field.label}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <Select
          value={String(value ?? '')}
          onChange={onChange}
          invalid={Boolean(error)}
          options={(field.options ?? []).map(opt => ({
            value: opt,
            label: opt
          }))}
        />
      )
    }

    return null
  })()

  if (control === null) return null

  return (
    <FormField
      label={field.label}
      required={field.required}
      error={error}
      className={field.id === 'note' ? formFieldNoteClass : undefined}
      controlWidth={resolvedWidth}
    >
      {control}
    </FormField>
  )
}
