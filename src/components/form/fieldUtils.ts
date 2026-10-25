import {
  BUILDING_FIELD_IDS,
  isNonFundPayer,
  PAYER_FIELD_ID,
  withBuildingFields,
  withoutBuildingFields
} from './buildingFields'
import {
  COUNTERPARTY_FIELD_ID,
  COUNTERPARTY_FIELD_LABEL,
  LINE_ITEMS_FIELD_ID,
  LINE_ITEMS_FIELD_LABEL,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_ACCOUNT_FIELD_LABEL,
  WALLET_APPLY_FIELD_ID,
  WALLET_APPLY_FIELD_LABEL,
  WALLET_APPLY_NO,
  WALLET_APPLY_YES
} from './recordFieldIds'
import { SHARED_FIELD_IDS, withoutSharedFields, withSharedFields } from './sharedFields'
import type { CustomForm, FieldConfig } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'

export * from './recordFieldIds'

export const SUBCATEGORY_FIELD_ID = 'subCategory'
export const SUBCATEGORY_FIELD_LABEL = 'زیردسته'

const STANDARD_FIELD_ORDER = [
  'date',
  'title',
  'category',
  SUBCATEGORY_FIELD_ID,
  'amount',
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID,
  'note',
  // Building workspaces only (buildingFields.ts); last, so the columns go at the end of the row.
  ...BUILDING_FIELD_IDS,
  // Shared accounts only (sharedFields.ts); never together with the building ones.
  ...SHARED_FIELD_IDS
]

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
    required: false,
    options: []
  }
}

/** A quick entry needs only category and amount; the title is filled in on save. */
const OPTIONAL_ENTRY_FIELD_IDS = [
  'title',
  SUBCATEGORY_FIELD_ID,
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID
]

/** Adds the subcategory field and relaxes title/subcategory on forms stored when they were required. */
export function withSubCategoryField(forms: CustomForm[]): CustomForm[] {
  return forms.map(form => {
    if (form.type !== 'income' && form.type !== 'expense') return form

    const fields = form.fields.some(field => field.id === SUBCATEGORY_FIELD_ID)
      ? form.fields
      : [...form.fields, createSubCategoryField()]

    return {
      ...form,
      fields: fields.map(field =>
        OPTIONAL_ENTRY_FIELD_IDS.includes(field.id) && field.required
          ? { ...field, required: false }
          : field
      )
    }
  })
}

/** An empty title becomes «دسته · زیردسته» so lists and reports stay readable. */
export function withAutoTitle(
  values: Record<string, string | number>
): Record<string, string | number> {
  if (String(values.title ?? '').trim()) return values

  const category = String(values.category ?? '').trim()

  if (!category) return values

  const subCategory = String(values[SUBCATEGORY_FIELD_ID] ?? '').trim()

  return { ...values, title: subCategory ? `${category} · ${subCategory}` : category }
}

function createWalletAccountField(): FieldConfig {
  return {
    id: WALLET_ACCOUNT_FIELD_ID,
    label: WALLET_ACCOUNT_FIELD_LABEL,
    type: 'select',
    required: false,
    options: []
  }
}

/** Adds the optional «حساب» field to income/expense forms that lack it. */
export function withWalletAccountField(forms: CustomForm[]): CustomForm[] {
  return forms.map(form =>
    (form.type === 'income' || form.type === 'expense') &&
    !form.fields.some(field => field.id === WALLET_ACCOUNT_FIELD_ID)
      ? { ...form, fields: [...form.fields, createWalletAccountField()] }
      : form
  )
}

function createWalletApplyField(): FieldConfig {
  return {
    id: WALLET_APPLY_FIELD_ID,
    label: WALLET_APPLY_FIELD_LABEL,
    type: 'select',
    required: false,
    options: [WALLET_APPLY_YES, WALLET_APPLY_NO]
  }
}

/** Adds the «اثر بر موجودی» switch to income/expense forms that lack it. */
export function withWalletApplyField(forms: CustomForm[]): CustomForm[] {
  return forms.map(form =>
    (form.type === 'income' || form.type === 'expense') &&
    !form.fields.some(field => field.id === WALLET_APPLY_FIELD_ID)
      ? { ...form, fields: [...form.fields, createWalletApplyField()] }
      : form
  )
}

function createCounterpartyField(): FieldConfig {
  return {
    id: COUNTERPARTY_FIELD_ID,
    label: COUNTERPARTY_FIELD_LABEL,
    type: 'select',
    required: false,
    options: []
  }
}

/** Adds the optional «طرف حساب» field to income/expense forms that lack it. */
export function withCounterpartyField(forms: CustomForm[]): CustomForm[] {
  return forms.map(form =>
    (form.type === 'income' || form.type === 'expense') &&
    !form.fields.some(field => field.id === COUNTERPARTY_FIELD_ID)
      ? { ...form, fields: [...form.fields, createCounterpartyField()] }
      : form
  )
}

function createLineItemsField(): FieldConfig {
  return { id: LINE_ITEMS_FIELD_ID, label: LINE_ITEMS_FIELD_LABEL, type: 'text', required: false }
}

/** Adds the optional «اقلام» (invoice line items) field to income/expense forms that lack it. */
export function withLineItemsField(forms: CustomForm[]): CustomForm[] {
  return forms.map(form =>
    (form.type === 'income' || form.type === 'expense') &&
    !form.fields.some(field => field.id === LINE_ITEMS_FIELD_ID)
      ? { ...form, fields: [...form.fields, createLineItemsField()] }
      : form
  )
}

/**
 * The standard record fields; the building ones are added in a building workspace and only there.
 * A shared account keeps no wallet, counterparty or line items and adds its own columns instead.
 */
export function withStandardFields(
  forms: CustomForm[],
  building = false,
  shared = false
): CustomForm[] {
  if (shared) return withSharedFields(withSubCategoryField(forms))

  const standard = withoutSharedFields(
    withLineItemsField(
      withCounterpartyField(
        withWalletApplyField(withWalletAccountField(withSubCategoryField(forms)))
      )
    )
  )

  return building ? withBuildingFields(standard) : withoutBuildingFields(standard)
}

export function isWalletApplied(values: Record<string, string | number | undefined>): boolean {
  return String(values[WALLET_APPLY_FIELD_ID] ?? '').trim() !== WALLET_APPLY_NO
}

/**
 * The balance switch only means something once the record names an account; a building expense
 * paid by someone other than the fund has no account at all (it is a debt, not a withdrawal).
 */
export function isFieldHidden(
  field: FieldConfig,
  values: Record<string, string | number | undefined>
): boolean {
  if (field.id === WALLET_ACCOUNT_FIELD_ID || field.id === WALLET_APPLY_FIELD_ID) {
    if (isNonFundPayer(values[PAYER_FIELD_ID])) return true
  }

  return field.id === WALLET_APPLY_FIELD_ID && !String(values[WALLET_ACCOUNT_FIELD_ID] ?? '').trim()
}

function sortByOrder(fields: FieldConfig[], orderIds: string[]): FieldConfig[] {
  const order = new Map(orderIds.map((id, index) => [id, index]))

  return [...fields].sort((a, b) => (order.get(a.id) ?? 1000) - (order.get(b.id) ?? 1000))
}

/** The sheet's column order. Not the order on screen: see `sortEntryFormFields`. */
export function sortFormFields(fields: FieldConfig[]): FieldConfig[] {
  return sortByOrder(fields, STANDARD_FIELD_ORDER)
}

/** Order on screen for a new entry and for editing a record: the amount follows the date. */
const ENTRY_DISPLAY_ORDER = [
  'date',
  'amount',
  ...STANDARD_FIELD_ORDER.filter(id => id !== 'date' && id !== 'amount')
]

export function sortEntryFormFields(fields: FieldConfig[]): FieldConfig[] {
  return sortByOrder(fields, ENTRY_DISPLAY_ORDER)
}

export function getInitialFieldValue(field: FieldConfig): string | number {
  if (field.type === 'date') return getTodayIso()
  if (field.type === 'number') return ''
  if (field.type === 'select' && field.options?.length) return field.options[0]

  return ''
}

/** Empty form values, overridden by `prefill` (e.g. from a bank SMS). */
export function buildFormInitialValues(
  form: CustomForm,
  prefill: Record<string, string | number> = {}
): Record<string, string | number> {
  const initial: Record<string, string | number> = {}

  form.fields.forEach(field => {
    initial[field.id] = prefill[field.id] ?? getInitialFieldValue(field)
  })

  return initial
}
