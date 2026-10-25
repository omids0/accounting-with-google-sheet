import { lazy, Suspense, useEffect, useState } from 'react'

import { SHARED_CHOICE_KEY, type SharedChoice } from '../../services/sharedLinkPrefs'
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

const startOf = (linkedTo: string): SharedChoice => ({
  on: !!linkedTo,
  sharedId: linkedTo || sharedSpreadsheetId() || '',
  category: '',
  split: 'equal',
  payer: ''
})

/**
 * The tick «در «<name>» هم ثبت شود» of the personal entry and edit forms: OFF by default, always
 * (on only for a record that already has a copy), held by the open form and never remembered.
 * `mark` adds what to save: the link column and the tick's answer (`takeSharedChoice` takes it
 * out again before the write). A vehicle expense keeps its own record shape and gets no tick.
 */
export function useSharedTick(
  form: CustomForm,
  values: Values,
  record?: { id: string; values: Record<string, string> }
) {
  const linkedTo = String(record?.values[SHARED_LINK_FIELD_ID] ?? '').trim()
  const [choice, setChoice] = useState(() => startOf(linkedTo))
  const sharedId = sharedSpreadsheetId()
  // Turned off on this device («فقط از منوی من پنهان شود»): no tick either.
  const active =
    (form.type === 'income' || form.type === 'expense') &&
    !!sharedId &&
    !isSharedAccountHidden(sharedId) &&
    isPersonalWorkspace() &&
    !(form.type === 'expense' && isVehicleExpenseCategory(String(values.category ?? '')))

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
            [SHARED_CHOICE_KEY]: JSON.stringify(choice)
          }
        : input,
    reset: () => setChoice(startOf(linkedTo))
  }
}
