import type { CustomForm, FieldConfig } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'

export const SUBCATEGORY_FIELD_ID = 'subCategory'
export const SUBCATEGORY_FIELD_LABEL = 'زیردسته'

const STANDARD_FIELD_ORDER = ['date', 'title', 'category', SUBCATEGORY_FIELD_ID, 'amount', 'note']

const REQUIRED_ENTRY_FIELD_IDS = ['date', 'title', 'category', 'amount', 'note']

export const STANDARD_ENTRY_FIELD_IDS = STANDARD_FIELD_ORDER

export function isStandardEntryForm(form: { fields: FieldConfig[] }): boolean {
  const ids = new Set(form.fields.map(field => field.id))

  return (
    REQUIRED_ENTRY_FIELD_IDS.every(id => ids.has(id)) &&
    form.fields.every(field => STANDARD_FIELD_ORDER.includes(field.id))
  )
}

export function createSubCategoryField(): FieldConfig {
  return {
    id: SUBCATEGORY_FIELD_ID,
    label: SUBCATEGORY_FIELD_LABEL,
    type: 'select',
    required: true,
    options: []
  }
}

export function withSubCategoryField(forms: CustomForm[]): CustomForm[] {
  return forms.map(form => {
    if (form.type !== 'income' && form.type !== 'expense') return form

    const existing = form.fields.find(field => field.id === SUBCATEGORY_FIELD_ID)

    if (!existing) {
      return { ...form, fields: [...form.fields, createSubCategoryField()] }
    }

    // Forms stored before the subcategory became mandatory keep required: false.
    if (existing.required) return form

    return {
      ...form,
      fields: form.fields.map(field =>
        field.id === SUBCATEGORY_FIELD_ID ? { ...field, required: true } : field
      )
    }
  })
}

export function sortFormFields(fields: FieldConfig[]): FieldConfig[] {
  const order = new Map(STANDARD_FIELD_ORDER.map((id, index) => [id, index]))

  return [...fields].sort((a, b) => {
    const aIndex = order.get(a.id) ?? 1000

    const bIndex = order.get(b.id) ?? 1000

    if (aIndex !== bIndex) return aIndex - bIndex

    return 0
  })
}

export function getInitialFieldValue(field: FieldConfig): string | number {
  if (field.type === 'date') return getTodayIso()
  if (field.type === 'number') return ''
  if (field.type === 'select' && field.options?.length) return field.options[0]

  return ''
}
