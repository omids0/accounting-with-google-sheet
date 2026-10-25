import { BUILDING_FIELD_IDS } from './buildingFields'
import {
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID
} from './recordFieldIds'
import type { CustomForm, FieldConfig } from '../../types'

/**
 * The shared account's record columns (spec «Records, payer and split»). Ids differ from the
 * building's `payer`/`split`, so `hasBuildingExpenseFields` never mistakes a shared form for one.
 */
export const SHARED_PAYER_FIELD_ID = 'sharedPayer'
export const SHARED_PAYER_FIELD_LABEL = 'پرداخت‌کننده'

/** `equal` or `only:<email>` (see `parseSplit`). */
export const SHARED_SPLIT_FIELD_ID = 'sharedSplit'
export const SHARED_SPLIT_FIELD_LABEL = 'تقسیم'

/** Who wrote the row first; not «ثبت‌کننده», the app-wide last-editor column (writerColumn.ts). */
export const SHARED_CREATOR_FIELD_ID = 'sharedCreator'
export const SHARED_CREATOR_FIELD_LABEL = 'ایجادکننده'

/** `share:<personalSpreadsheetId>:<personalRecordId>` of a copy; empty for a direct record. */
export const SHARED_REF_FIELD_ID = 'sharedRef'
export const SHARED_REF_FIELD_LABEL = 'مرجع'

/** In sheet order: the last columns of a shared account's record row. */
export const SHARED_FIELD_IDS = [
  SHARED_PAYER_FIELD_ID,
  SHARED_SPLIT_FIELD_ID,
  SHARED_CREATOR_FIELD_ID,
  SHARED_REF_FIELD_ID
]

/** Their header labels, in the same order. */
export const SHARED_FIELD_LABELS = [
  SHARED_PAYER_FIELD_LABEL,
  SHARED_SPLIT_FIELD_LABEL,
  SHARED_CREATOR_FIELD_LABEL,
  SHARED_REF_FIELD_LABEL
]

/** A shared record moves no wallet and carries no counterparty or line items (privacy-first). */
const NOT_SHARED_FIELD_IDS = [
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID,
  ...BUILDING_FIELD_IDS
]

const textField = (id: string, label: string): FieldConfig => ({
  id,
  label,
  type: 'text',
  required: false
})

function sharedFields(): FieldConfig[] {
  return [
    { ...textField(SHARED_PAYER_FIELD_ID, SHARED_PAYER_FIELD_LABEL), type: 'select', options: [] },
    textField(SHARED_SPLIT_FIELD_ID, SHARED_SPLIT_FIELD_LABEL),
    textField(SHARED_CREATOR_FIELD_ID, SHARED_CREATOR_FIELD_LABEL),
    textField(SHARED_REF_FIELD_ID, SHARED_REF_FIELD_LABEL)
  ]
}

const isRecordForm = (form: CustomForm) => form.type === 'income' || form.type === 'expense'

export const hasSharedFields = (form: CustomForm): boolean =>
  form.fields.some(field => field.id === SHARED_PAYER_FIELD_ID)

/**
 * The income / expense forms of a shared account: the personal-only fields out, the shared columns
 * in (once). `withoutSharedFields` undoes it for a form that had no personal-only fields.
 */
export function withSharedFields(forms: CustomForm[]): CustomForm[] {
  return forms.map(form => {
    if (!isRecordForm(form)) return form

    const kept = form.fields.filter(field => !NOT_SHARED_FIELD_IDS.includes(field.id))
    const missing = sharedFields().filter(field => !kept.some(existing => existing.id === field.id))

    return kept.length === form.fields.length && !missing.length
      ? form
      : { ...form, fields: [...kept, ...missing] }
  })
}

/** A personal sheet or a building never carries them: switching back drops the columns. */
export function withoutSharedFields(forms: CustomForm[]): CustomForm[] {
  return forms.map(form =>
    form.fields.some(field => SHARED_FIELD_IDS.includes(field.id))
      ? { ...form, fields: form.fields.filter(field => !SHARED_FIELD_IDS.includes(field.id)) }
      : form
  )
}

export type SharedSplit = 'equal' | `only:${string}`

const ONLY_PREFIX = 'only:'

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+$/

/**
 * A cell → the split; anything but `only:<email>` (any case) is `equal`: an empty cell, an older
 * row, or an `only:` without an e-mail-like name after it (never charge a half-typed name).
 */
export function parseSplit(value: string): SharedSplit {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()

  if (!text.startsWith(ONLY_PREFIX)) return 'equal'

  const email = text.slice(ONLY_PREFIX.length).trim()

  return EMAIL_LIKE.test(email) ? `only:${email}` : 'equal'
}
