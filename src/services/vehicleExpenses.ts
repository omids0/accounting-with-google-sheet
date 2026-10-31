import {
  createLinkedExpenseRecord,
  deleteLinkedRecord,
  type LinkedRecordWallet
} from './paymentTransactions'
import {
  applyWalletChanges,
  logUnappliedRecord,
  recordLedgerContext,
  walletEffectOf
} from './recordWallet'
import { getSettings, updateFormCategories } from './settings'
import { fetchRecords } from './sheets'
import { WALLET_ACCOUNT_FIELD_ID, WALLET_APPLY_FIELD_ID } from '../components/form/fieldUtils'
import { VEHICLE_EXPENSE_CATEGORY } from '../components/vehicles/constants'
import type { CustomForm } from '../types'
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
  /** Account (and balance switch) the expense names; the balance moves unless it opted out. */
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

async function findFirstRecord(spreadsheetId: string, form: CustomForm, ids: string[]) {
  const records = await fetchRecords(spreadsheetId, form)

  for (const id of ids) {
    const match = records.find(record => record.id === id)

    if (match) return match
  }

  return undefined
}

/**
 * A service done again is a NEW cycle with its OWN expense: the earlier cycle's record (its amount,
 * date and wallet effect) is never touched, so history, totals and the account ledger keep every
 * cycle. Only the account and balance switch of the earlier record are read (never written), so
 * the new cycle is paid from the same account the last one was. `previousExpenseIds` lists the
 * earlier cycles' expenses, newest first; the first that still exists is used, and when none
 * does (the only cycle was deleted) the new expense has no account. The wallet move is the shared
 * `createVehicleExpense` path (one serial wallet write, one «ثبت» ledger line).
 * @returns the id of the new expense ('' without an amount: no expense is made).
 */
export async function createNextCycleVehicleExpense(
  spreadsheetId: string,
  previousExpenseIds: string[],
  params: Omit<VehicleExpenseParams, 'walletAccount' | 'walletApply'>
): Promise<string> {
  if (params.amount <= 0) return ''

  const form = getSettings()?.forms.find(item => item.type === 'expense')
  const previous =
    form && previousExpenseIds.length
      ? await findFirstRecord(spreadsheetId, form, previousExpenseIds)
      : undefined

  return createVehicleExpense(spreadsheetId, {
    ...params,
    walletAccount: previous?.values[WALLET_ACCOUNT_FIELD_ID],
    walletApply: previous?.values[WALLET_APPLY_FIELD_ID]
  })
}
