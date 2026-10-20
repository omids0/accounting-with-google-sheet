import type { CustomForm, FieldConfig } from '../../types'

/** Round 11: «نوع هزینه», the unit split (JSON) and who paid; only expense forms of a building. */
export const EXPENSE_KIND_FIELD_ID = 'expenseKind'
export const EXPENSE_KIND_FIELD_LABEL = 'نوع هزینه'

export const SPLIT_FIELD_ID = 'split'
export const SPLIT_FIELD_LABEL = 'تقسیم'

export const PAYER_FIELD_ID = 'payer'
export const PAYER_FIELD_LABEL = 'پرداخت‌کننده'

/** In sheet order: the three columns follow the standard ones, at the end of the row. */
export const BUILDING_FIELD_IDS = [EXPENSE_KIND_FIELD_ID, SPLIT_FIELD_ID, PAYER_FIELD_ID]

function buildingFields(): FieldConfig[] {
  return [
    {
      id: EXPENSE_KIND_FIELD_ID,
      label: EXPENSE_KIND_FIELD_LABEL,
      type: 'select',
      required: false,
      options: []
    },
    { id: SPLIT_FIELD_ID, label: SPLIT_FIELD_LABEL, type: 'text', required: false },
    {
      id: PAYER_FIELD_ID,
      label: PAYER_FIELD_LABEL,
      type: 'select',
      required: false,
      options: []
    }
  ]
}

/** Adds the building fields to expense forms that lack them (same pattern as `withWalletAccountField`). */
export function withBuildingFields(forms: CustomForm[]): CustomForm[] {
  return forms.map(form => {
    if (form.type !== 'expense') return form

    const missing = buildingFields().filter(
      field => !form.fields.some(existing => existing.id === field.id)
    )

    return missing.length ? { ...form, fields: [...form.fields, ...missing] } : form
  })
}

/** A personal workspace never carries them: switching back from a building drops the fields. */
export function withoutBuildingFields(forms: CustomForm[]): CustomForm[] {
  return forms.map(form =>
    form.fields.some(field => BUILDING_FIELD_IDS.includes(field.id))
      ? { ...form, fields: form.fields.filter(field => !BUILDING_FIELD_IDS.includes(field.id)) }
      : form
  )
}
