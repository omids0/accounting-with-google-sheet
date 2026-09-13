import { createLinkedExpenseRecord, deleteLinkedRecord } from './paymentTransactions'
import { getSettings, updateFormCategories } from './settings'
import { VEHICLE_EXPENSE_CATEGORY } from '../components/vehicles/constants'

export async function ensureVehicleExpenseCategory(): Promise<void> {
  const settings = getSettings()

  if (!settings) return

  const expenseForm = settings.forms.find(form => form.type === 'expense')

  if (!expenseForm) return

  const options = expenseForm.fields.find(field => field.id === 'category')?.options ?? []

  if (options.includes(VEHICLE_EXPENSE_CATEGORY)) return

  updateFormCategories(expenseForm.id, [...options, VEHICLE_EXPENSE_CATEGORY])
}

export async function createVehicleExpense(
  spreadsheetId: string,
  params: {
    title: string
    amount: number
    note?: string
    date?: string
  }
): Promise<string> {
  await ensureVehicleExpenseCategory()

  if (params.amount <= 0) return ''

  return createLinkedExpenseRecord(spreadsheetId, {
    ...params,
    category: VEHICLE_EXPENSE_CATEGORY
  })
}

export async function deleteVehicleExpense(
  spreadsheetId: string,
  expenseRecordId: string
): Promise<void> {
  if (!expenseRecordId) return

  await deleteLinkedRecord(spreadsheetId, 'expense', expenseRecordId)
}
