import type { FieldConfig } from '../../types'
import AmountInput from '../AmountInput'
import JalaliDatePicker from '../JalaliDatePicker'
import CategorySelect from './CategorySelect'
import FormField from './FormField'
import Select from './Select'
import { formNoteTextareaClass } from '../ui/formControlStyles'
import { formControlClassName } from '../ui/formStyles'
import { formFieldNoteClass } from '../ui/recordsStyles'

interface FieldInputProps {
  field: FieldConfig
  value: string | number
  onChange: (value: string | number) => void
  formId?: string
  onCategoriesChange?: (categories: string[]) => void
}

function fieldPlaceholder(field: FieldConfig): string | undefined {
  if (field.id === 'note') return 'توضیحات اضافه...'
  if (field.id === 'amount') return '۰'
  if (field.type === 'text') return `مثلاً: ${field.label}`

  return undefined
}

export default function FieldInput({
  field,
  value,
  onChange,
  formId,
  onCategoriesChange
}: FieldInputProps) {
  const placeholder = fieldPlaceholder(field)

  return (
    <FormField
      label={field.label}
      required={field.required}
      className={field.id === 'note' ? formFieldNoteClass : undefined}
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
