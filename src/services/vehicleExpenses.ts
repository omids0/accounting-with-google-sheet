import {
  createLinkedExpenseRecord,
  deleteLinkedRecord,
  linkedRecordValues,
  type LinkedRecordWallet
} from './paymentTransactions'
import {
  applyWalletChanges,
  logUnappliedRecord,
  recordLedgerContext,
  walletEffectOf
} from './recordWallet'
import { getSettings, updateFormCategories } from './settings'
import { fetchRecords, updateRecord } from './sheets'
import { WALLET_ACCOUNT_FIELD_ID, WALLET_APPLY_FIELD_ID } from '../components/form/fieldUtils'
import { VEHICLE_EXPENSE_CATEGORY } from '../components/vehicles/constants'
import { getTodayIso } from '../utils/jalaliDate'
import { withLockedExpenseCategories } from '../utils/protectedCategories'

export async function ensureVehicleExpenseCategory(): Promise<void> {
  const settings = getSettings()

  if (!settings) return

  const expenseForm = settings.forms.find(form => form.type === 'expense')

  if (!expenseForm) return

  const options = expenseForm.fields.find(field => field.id === 'category')?.options ?? []
  const next = withLockedExpenseCategories(options)

  if (next.length === options.length && options.includes(VEHICLE_EXPENSE_CATEGORY)) return

  updateFormCategories(expenseForm.id, next)
}

interface VehicleExpenseParams {
  title: string
  amount: number
  subCategory?: string
  note?: string
  date?: string
  /**
   * Account (and balance switch) of the record this one replaces; the balance moves
   * with the new amount unless that record opted out.
   */
  walletAccount?: string
  walletApply?: string
}

export async function createVehicleExpense(
  spreadsheetId: string,
  params: VehicleExpenseParams
): Promise<string> {
  await ensureVehicleExpenseCategory()

  if (params.amount <= 0) return ''

  const recordId = await createLinkedExpenseRecord(spreadsheetId, {
    ...params,
    category: VEHICLE_EXPENSE_CATEGORY
  })
  const values = { ...params, date: params.date ?? getTodayIso() }
  const context = recordLedgerContext(values, 'ثبت', recordId)

  await applyWalletChanges(spreadsheetId, null, walletEffectOf('expense', values), context)
  await logUnappliedRecord(spreadsheetId, 'expense', values, context)

  return recordId
}

/** @returns the wallet account and balance switch of the deleted record. */
export async function deleteVehicleExpense(
  spreadsheetId: string,
  expenseRecordId: string
): Promise<LinkedRecordWallet> {
  return deleteLinkedRecord(spreadsheetId, 'expense', expenseRecordId)
}

/**
 * A service done again takes the place of its earlier expense. The record is EDITED in place (same
 * id, same account and balance switch), exactly as the records page edits it: the account moves by
 * the difference in ONE write and one «ویرایش» line, instead of a refund and a new debit as two
 * writes on the same wallet row, one of which a slow or interrupted sync could lose. Without an
 * earlier record, or without a new amount, there is nothing to net: it is created or deleted.
 * Each service cycle still REPLACES the previous cycle's expense, by existing design (an owner
 * decision is pending on whether a new cycle should be its own expense).
 * @returns the id of the expense that now stands for the service ('' without an amount).
 */
export async function replaceVehicleExpense(
  spreadsheetId: string,
  previousExpenseId: string,
  params: Omit<VehicleExpenseParams, 'walletAccount' | 'walletApply'>
): Promise<string> {
  const form = getSettings()?.forms.find(item => item.type === 'expense')
  const previous =
    form && previousExpenseId && params.amount > 0
      ? (await fetchRecords(spreadsheetId, form)).find(record => record.id === previousExpenseId)
      : undefined

  if (!form || !previous) {
    const wallet = await deleteVehicleExpense(spreadsheetId, previousExpenseId)

    return createVehicleExpense(spreadsheetId, { ...params, ...wallet })
  }

  await ensureVehicleExpenseCategory()

  const values = {
    ...previous.values,
    ...linkedRecordValues({
      ...params,
      category: VEHICLE_EXPENSE_CATEGORY,
      walletAccount: previous.values[WALLET_ACCOUNT_FIELD_ID],
      walletApply: previous.values[WALLET_APPLY_FIELD_ID]
    })
  }

  await updateRecord(
    spreadsheetId,
    form,
    previous.rowNumber,
    previous.id,
    previous.createdAt,
    values,
    previous.sheetName
  )
  await applyWalletChanges(
    spreadsheetId,
    walletEffectOf('expense', previous.values),
    walletEffectOf('expense', values),
    recordLedgerContext(values, 'ویرایش', previous.id)
  )

  return previous.id
}
