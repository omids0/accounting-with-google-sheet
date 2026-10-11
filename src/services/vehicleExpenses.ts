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

export async function createVehicleExpense(
  spreadsheetId: string,
  params: {
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
