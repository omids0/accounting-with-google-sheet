import { createLinkedExpenseRecord, deleteLinkedRecord } from './paymentTransactions'
import { applyWalletChanges } from './recordWallet'
import { getSettings, updateFormCategories } from './settings'
import { VEHICLE_EXPENSE_CATEGORY } from '../components/vehicles/constants'
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
    /** Account of the record this one replaces; its balance moves with the new amount. */
    walletAccount?: string
  }
): Promise<string> {
  await ensureVehicleExpenseCategory()

  if (params.amount <= 0) return ''

  const recordId = await createLinkedExpenseRecord(spreadsheetId, {
    ...params,
    category: VEHICLE_EXPENSE_CATEGORY
  })

  if (params.walletAccount) {
    await applyWalletChanges(spreadsheetId, null, {
      accountId: params.walletAccount,
      delta: -params.amount
    })
  }

  return recordId
}

/** @returns the wallet account the deleted record named ('' if none). */
export async function deleteVehicleExpense(
  spreadsheetId: string,
  expenseRecordId: string
): Promise<string> {
  if (!expenseRecordId) return ''

  return deleteLinkedRecord(spreadsheetId, 'expense', expenseRecordId)
}
