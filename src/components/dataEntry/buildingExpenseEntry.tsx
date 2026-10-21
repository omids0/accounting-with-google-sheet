import { lazy, Suspense, type ComponentProps } from 'react'

import { readBridgePrefs } from '../../services/bridgePrefs'
import {
  buildingExpenseError,
  prepareBuildingExpenseValues
} from '../../services/buildingExpenseSplit'
import type { CustomForm } from '../../types'
import { isNonFundPayer, PAYER_FIELD_ID } from '../form/buildingFields'

/** Building-only form blocks load on demand, so personal pages never pay for them. */
const BuildingExpenseFields = lazy(() => import('../buildings/BuildingExpenseFields'))

export function LazyBuildingExpenseFields(props: ComponentProps<typeof BuildingExpenseFields>) {
  return (
    <Suspense fallback={null}>
      <BuildingExpenseFields {...props} />
    </Suspense>
  )
}

/** The expense form of a building workspace: the standard form plus kind, payer and split. */
export const hasBuildingExpenseFields = (form: CustomForm): boolean =>
  form.type === 'expense' && form.fields.some(field => field.id === PAYER_FIELD_ID)

type Values = Record<string, string | number>

/** Values as they are written: a payer other than the fund leaves no account behind. */
export const prepareBuildingEntry = (form: CustomForm, values: Values): Values =>
  hasBuildingExpenseFields(form) ? prepareBuildingExpenseValues(values) : values

/** Why the form cannot be saved yet (a manual split that does not add up), or null. */
export const buildingEntryError = (form: CustomForm, values: Values): string | null =>
  hasBuildingExpenseFields(form) ? buildingExpenseError(values) : null

/**
 * After a building expense is edited: its bridged personal receivable (when it has one) follows
 * the new title, amount and date. Never fails the edit: whatever cannot be sent stays queued.
 */
export async function syncBridgedEdit(
  form: CustomForm,
  recordId: string,
  values: Values
): Promise<void> {
  if (!hasBuildingExpenseFields(form) || !readBridgePrefs().sent[recordId]) return

  const { syncBridgedExpenseEdit } = await import('../../services/bridgeSync')

  await syncBridgedExpenseEdit(
    recordId,
    values,
    form.fields.find(field => field.type === 'date')?.id
  ).catch(() => undefined)
}

/**
 * After the record is written: the unit shares and the debt to a payer other than the fund.
 * Nothing for personal forms. The record exists already, so a failure is reported, not retried.
 */
export async function settleBuildingEntry(
  spreadsheetId: string,
  form: CustomForm,
  recordId: string,
  values: Values
): Promise<void> {
  if (!hasBuildingExpenseFields(form)) return

  const { syncBuildingExpense } = await import('../../services/buildingExpenseActions')

  const dateFieldId = form.fields.find(field => field.type === 'date')?.id

  await syncBuildingExpense(spreadsheetId, recordId, values, dateFieldId)

  // Bridge A: a manager's pocket expense (ticked) also becomes a receivable in the personal sheet.
  // It never fails the save: whatever cannot be sent stays queued there.
  if (readBridgePrefs().pocket && isNonFundPayer(values[PAYER_FIELD_ID])) {
    const { bridgePocketExpense } = await import('../../services/buildingBridge')

    await bridgePocketExpense(recordId, values, dateFieldId).catch(() => false)
  }
}
