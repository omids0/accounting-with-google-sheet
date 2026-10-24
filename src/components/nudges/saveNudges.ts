import { createElement } from 'react'

import { showSavedWithNudge, type NudgeOffer } from './NudgeToast'
import { getDateFieldId } from '../../services/dashboardAggregation'
import type * as Actions from '../../services/nudgeActions'
import { setNudgeHandoff, trackNoAccountStreak } from '../../services/nudges'
import {
  detectFirstCheck,
  detectMissingAccounts,
  detectRepeatedCounterparty,
  detectVehicleExpense,
  type VehicleExpenseLink
} from '../../services/nudgeSignals'
import { savedInSheetMessage, waitForSheetConfirmation } from '../../services/saveConfirmation'
import { getSettings } from '../../services/settings'
import type { VehicleExpenseInput } from '../../services/vehicleExpenseActions'
import { useNavigationStore } from '../../stores/navigationStore'
import type { CustomForm } from '../../types'
import { normalizeSheetDate } from '../../utils/sheetValues'
import { hideSaving, showError, showSaving, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import { COUNTERPARTY_FIELD_ID, WALLET_ACCOUNT_FIELD_ID } from '../form/fieldUtils'
import RecurringToastAction from '../recurring/RecurringToastAction'

/** The positive answer's work lives in a lazy chunk; only a tap loads it. */
function run(task: (actions: typeof Actions) => Promise<void>, done: string) {
  void import('../../services/nudgeActions')
    .then(task)
    .then(() => showSuccess(done))
    .catch(err => showError(toUserMessage(err, 'انجام نشد')))
}

function counterpartyOffer(spreadsheetId: string, name: string): NudgeOffer | null {
  const signal = spreadsheetId ? detectRepeatedCounterparty(spreadsheetId, name) : null

  return (
    signal && {
      ...signal,
      title: `${name.trim()} را به طرف حساب‌ها اضافه کنم؟`,
      actionLabel: 'اضافه کن',
      accept: () =>
        run(
          actions => actions.addCounterpartyByName(spreadsheetId, name),
          'به طرف حساب‌ها اضافه شد'
        )
    }
  )
}

const activeSpreadsheetId = () => getSettings()?.spreadsheetId ?? ''

/** After a new dang or receivable: the repeated-name suggestion. */
export function showSavedForCounterparty(message: string, name: string) {
  showSavedWithNudge(message, [counterpartyOffer(activeSpreadsheetId(), name)])
}

/** After a new check: the reminder suggestion first, then the repeated name. */
export function showSavedForCheck(message: string, name: string) {
  const spreadsheetId = activeSpreadsheetId()
  const reminder = spreadsheetId ? detectFirstCheck(spreadsheetId) : null

  showSavedWithNudge(message, [
    reminder && {
      ...reminder,
      title: 'یادآوری سررسید چک روشن شود؟',
      actionLabel: 'روشن کن',
      accept: () =>
        run(actions => actions.enableCheckReminder(spreadsheetId), 'یادآوری سررسید چک روشن شد')
    },
    counterpartyOffer(spreadsheetId, name)
  ])
}

/** «تکرار ماهانه» inside the saved toast of an income/expense record. */
function recurringOption(form: CustomForm, values: Record<string, string | number>) {
  const dateIso = normalizeSheetDate(values[getDateFieldId(form)] ?? '')

  if ((form.type !== 'income' && form.type !== 'expense') || !dateIso) return undefined

  return createElement(RecurringToastAction, { draft: { type: form.type, values, dateIso } })
}

/**
 * After an income/expense from the entry form: vehicle link, wallet account or a
 * repeated counterparty, and the «تکرار ماهانه» option on the saved toast. The toast says
 * «در شیت» only once the outbox has sent the row; offline or slow, it says the row is queued.
 */
export function showSavedForEntry(
  form: CustomForm,
  recordId: string,
  values: Record<string, string | number>,
  vehicleInput: VehicleExpenseInput | null
) {
  const spreadsheetId = activeSpreadsheetId()

  // At once a neutral «در حال ذخیره…»; the real wording replaces it when the outbox has answered.
  showSaving()
  void waitForSheetConfirmation(spreadsheetId)
    .catch(() => false)
    .then(confirmed => {
      hideSaving()
      presentSavedForEntry(
        savedInSheetMessage(form.sheetName, confirmed),
        spreadsheetId,
        form,
        recordId,
        values,
        vehicleInput
      )
    })
    .catch(() => {
      hideSaving()
      showSuccess(savedInSheetMessage(form.sheetName, false))
    })
}

function presentSavedForEntry(
  message: string,
  spreadsheetId: string,
  form: CustomForm,
  recordId: string,
  values: Record<string, string | number>,
  vehicleInput: VehicleExpenseInput | null
) {
  if (!spreadsheetId || form.type === 'custom') return showSuccess(message)

  const streak = trackNoAccountStreak(spreadsheetId, !!values[WALLET_ACCOUNT_FIELD_ID])
  const vehicle = vehicleInput && detectVehicleExpense(spreadsheetId, vehicleInput.vehicleId)
  const account = detectMissingAccounts(spreadsheetId, streak)
  const link: VehicleExpenseLink | null = vehicleInput && { recordId, input: vehicleInput }

  showSavedWithNudge(
    message,
    [
      vehicle && {
        ...vehicle,
        title: 'این هزینه خودرو بود؟',
        text: 'با تعریف خودرو، سرویس بعدی و کارکرد حساب می‌شود.',
        actionLabel: 'وصل کن به خودرو',
        // The vehicles page opens its add form and moves this expense onto the new vehicle.
        accept: () => {
          setNudgeHandoff(vehicle.id, link)
          useNavigationStore.getState().onTabChange('vehicle-service')
        }
      },
      account && {
        ...account,
        title: 'حساب کیف پول برای تراکنش‌ها انتخاب می‌کنی تا موجودی خودکار به‌روز شود؟',
        actionLabel: 'انتخاب حساب',
        pickAccount: accountId =>
          run(
            actions => actions.assignRecordAccount(spreadsheetId, form, recordId, accountId),
            'حساب تراکنش ثبت شد'
          )
      },
      counterpartyOffer(spreadsheetId, String(values[COUNTERPARTY_FIELD_ID] ?? ''))
    ],
    recurringOption(form, values)
  )
}
