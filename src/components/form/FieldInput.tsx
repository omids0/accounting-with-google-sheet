import type { FieldConfig } from '../../types'
import AmountInput from '../AmountInput'
import JalaliDatePicker from '../JalaliDatePicker'
import CategorySelect from './CategorySelect'
import FormField from './FormField'
import Select from './Select'
import { formNoteTextareaClass } from '../ui/formControlStyles'
import { formControlClassName, type FormControlWidth } from '../ui/formStyles'
import { formFieldNoteClass } from '../ui/recordsStyles'

interface FieldInputProps {
  field: FieldConfig
  value: string | number
  onChange: (value: string | number) => void
  formId?: string
  onCategoriesChange?: (categories: string[]) => void
  controlWidth?: FormControlWidth
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
  controlWidth
}: FieldInputProps) {
  const placeholder = fieldPlaceholder(field)
  const resolvedWidth = controlWidth ?? defaultControlWidth(field)

  return (
    <FormField
      label={field.label}
      required={field.required}
      className={field.id === 'note' ? formFieldNoteClass : undefined}
      controlWidth={resolvedWidth}
    >
      {field.type === 'text' && field.id === 'note' ? (
        <textarea
          className={formControlClassName(formNoteTextareaClass)}
          rows={4}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : field.type === 'text' ? (
        <input
          type="text"
          className={formControlClassName()}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : null}

      {field.type === 'number' && field.id === 'amount' && (
        <AmountInput value={value ?? ''} onChange={onChange} />
      )}

      {field.type === 'number' && field.id !== 'amount' && (
        <input
          type="number"
          className={formControlClassName()}
          inputMode="decimal"
          value={value === '' ? '' : value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          dir="ltr"
          placeholder={placeholder}
        />
      )}

      {field.type === 'date' && (
        <JalaliDatePicker value={String(value ?? '')} onChange={iso => onChange(iso)} />
      )}

      {field.type === 'select' && field.id === 'category' && formId ? (
        <CategorySelect
          value={String(value ?? '')}
          onChange={next => onChange(next)}
          categories={field.options ?? []}
          formId={formId}
          onCategoriesChange={onCategoriesChange}
          aria-label={field.label}
        />
      ) : field.type === 'select' ? (
        <Select
          value={String(value ?? '')}
          onChange={onChange}
          options={(field.options ?? []).map(opt => ({
            value: opt,
            label: opt
          }))}
        />
      ) : null}
    </FormField>
  )
}
