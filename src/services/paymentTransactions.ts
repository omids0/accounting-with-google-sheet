import { getSettings } from './settings'
import { appendRecord, deleteRecord, ensureFormSheet, fetchRecords } from './sheets'
import { SUBCATEGORY_FIELD_ID } from '../components/form/fieldUtils'
import type { CustomForm } from '../types'
import { OTHER_CATEGORY } from '../utils/categoryOrdering'
import { getTodayIso } from '../utils/jalaliDate'

function getFormByType(type: 'income' | 'expense'): CustomForm | undefined {
  return getSettings()?.forms.find(f => f.type === type)
}

/** An unnamed category falls into «سایر» rather than whichever option happens to be first. */
function resolveCategory(category?: string): string {
  return category?.trim() || OTHER_CATEGORY
}

export interface LinkedRecordParams {
  title: string
  amount: number
  category?: string
  subCategory?: string
  note?: string
  date?: string
}

export async function createLinkedExpenseRecord(
  spreadsheetId: string,
  params: LinkedRecordParams
): Promise<string> {
  const expenseForm = getFormByType('expense')

  if (!expenseForm) throw new Error('فرم هزینه پیدا نشد')

  await ensureFormSheet(spreadsheetId, expenseForm)

  const recordId = crypto.randomUUID()

  const createdAt = new Date().toLocaleString('fa-IR')

  const date = params.date ?? getTodayIso()

  await appendRecord(spreadsheetId, expenseForm, recordId, createdAt, {
    date,
    title: params.title,
    category: resolveCategory(params.category),
    [SUBCATEGORY_FIELD_ID]: resolveCategory(params.subCategory),
    amount: params.amount,
    note: params.note ?? ''
  })

  return recordId
}

export async function createLinkedIncomeRecord(
  spreadsheetId: string,
  params: LinkedRecordParams
): Promise<string> {
  const incomeForm = getFormByType('income')

  if (!incomeForm) throw new Error('فرم درآمد پیدا نشد')

  await ensureFormSheet(spreadsheetId, incomeForm)

  const recordId = crypto.randomUUID()

  const createdAt = new Date().toLocaleString('fa-IR')

  const date = params.date ?? getTodayIso()

  await appendRecord(spreadsheetId, incomeForm, recordId, createdAt, {
    date,
    title: params.title,
    category: resolveCategory(params.category),
    [SUBCATEGORY_FIELD_ID]: resolveCategory(params.subCategory),
    amount: params.amount,
    note: params.note ?? ''
  })

  return recordId
}

export async function deleteLinkedRecord(
  spreadsheetId: string,
  formType: 'income' | 'expense',
  recordId: string
): Promise<void> {
  if (!recordId) return

  const form = getFormByType(formType)

  if (!form) return

  const records = await fetchRecords(spreadsheetId, form)

  const match = records.find(r => r.id === recordId)

  if (match) {
    await deleteRecord(spreadsheetId, form, match.rowNumber)
  }
}

export async function deleteLinkedExpenseRecord(
  spreadsheetId: string,
  recordId: string
): Promise<void> {
  await deleteLinkedRecord(spreadsheetId, 'expense', recordId)
}

export async function deleteLinkedIncomeRecord(
  spreadsheetId: string,
  recordId: string
): Promise<void> {
  await deleteLinkedRecord(spreadsheetId, 'income', recordId)
}
