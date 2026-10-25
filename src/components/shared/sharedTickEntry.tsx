import { lazy, Suspense, useEffect, useState } from 'react'

import { SHARED_CHOICE_KEY, typedTitle, type SharedChoice } from '../../services/sharedLinkPrefs'
import {
  isPersonalWorkspace,
  isSharedAccountHidden,
  sharedSpreadsheetId
} from '../../services/workspace'
import type { CustomForm } from '../../types'
import { isVehicleExpenseCategory } from '../../utils/vehicleExpenseUtils'
import { SHARED_LINK_FIELD_ID } from '../form/sharedFields'

/** Loads only on a device with a shared account; everyone else never downloads it. */
const SharedTick = lazy(() => import('./SharedTick'))

type Values = Record<string, string | number>

/** Split, payer and category start unset: a new copy takes the defaults, a linked one its own. */
const startOf = (linkedTo: string): SharedChoice => ({
  on: !!linkedTo,
  sharedId: linkedTo || sharedSpreadsheetId() || '',
  category: '',
  split: '',
  payer: ''
})

/**
 * Whether the personal form shows the tick: a record form on a personal sheet of a device with a
 * visible shared account. A NEW vehicle expense keeps its own record shape and gets none; a
 * linked record keeps its tick whatever its category becomes, so the copy follows (or goes).
 */
export function isTickShown(form: CustomForm, category: unknown, linkedTo: string): boolean {
  const sharedId = sharedSpreadsheetId()

  return (
    (form.type === 'income' || form.type === 'expense') &&
    !!sharedId &&
    !isSharedAccountHidden(sharedId) &&
    isPersonalWorkspace() &&
    (!!linkedTo || !(form.type === 'expense' && isVehicleExpenseCategory(String(category ?? ''))))
  )
}

/**
 * The tick «در «<name>» هم ثبت شود» of the personal entry and edit forms: OFF by default, always
 * (on only for a record that already has a copy), held by the open form and never remembered.
 * `mark` adds what to save: the link column and the tick's answer with the title as TYPED
 * (`takeSharedChoice` takes it out again before the write).
 */
export function useSharedTick(
  form: CustomForm,
  values: Values,
  record?: { id: string; values: Record<string, string> }
) {
  const linkedTo = String(record?.values[SHARED_LINK_FIELD_ID] ?? '').trim()
  const [choice, setChoice] = useState(() => startOf(linkedTo))
  const active = isTickShown(form, values.category, linkedTo)

  useEffect(() => setChoice(startOf(linkedTo)), [linkedTo, record?.id, form.id])

  return {
    element: active ? (
      <Suspense fallback={null}>
        <SharedTick
          type={form.type as 'income' | 'expense'}
          values={values}
          linked={!!linkedTo}
          editing={!!record}
          recordId={record?.id}
          choice={choice}
          onChange={patch => setChoice(current => ({ ...current, ...patch }))}
        />
      </Suspense>
    ) : null,
    mark: (input: Values): Values =>
      active
        ? {
            ...input,
            [SHARED_LINK_FIELD_ID]: choice.on ? choice.sharedId : '',
            [SHARED_CHOICE_KEY]: JSON.stringify({
              ...choice,
              title: typedTitle(values, record?.values)
            })
          }
        : input,
    reset: () => setChoice(startOf(linkedTo))
  }
}
