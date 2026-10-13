import { applyWalletChanges, recordLedgerContext, walletEffectOf } from './recordWallet'
import { getSettings } from './settings'
import { appendRecord, deleteRecord, ensureFormSheet, fetchRecords } from './sheets'
import {
  SUBCATEGORY_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID
} from '../components/form/fieldUtils'
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

/** Wallet fields of a deleted record ('' when it had none). */
export interface LinkedRecordWallet {
  walletAccount: string
  walletApply: string
}

export interface LinkedRecordParams {
  title: string
  amount: number
  category?: string
  subCategory?: string
  note?: string
  date?: string
  /** Wallet account the record names (its balance is moved by the caller). */
  walletAccount?: string
  /** «خیر» when the record names the account without moving its balance. */
  walletApply?: string
}

/** The cells of the record a settlement writes (also what moves the wallet balance). */
export function linkedRecordValues(params: LinkedRecordParams): Record<string, string | number> {
  return {
    date: params.date ?? getTodayIso(),
    title: params.title,
    category: resolveCategory(params.category),
    [SUBCATEGORY_FIELD_ID]: resolveCategory(params.subCategory),
    amount: params.amount,
    note: params.note ?? '',
    [WALLET_ACCOUNT_FIELD_ID]: params.walletAccount ?? '',
    [WALLET_APPLY_FIELD_ID]: params.walletApply ?? ''
  }
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

  await appendRecord(spreadsheetId, expenseForm, recordId, createdAt, linkedRecordValues(params))

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

  await appendRecord(spreadsheetId, incomeForm, recordId, createdAt, linkedRecordValues(params))

  return recordId
}

/**
 * Deletes the record and undoes its wallet effect; returns its account and balance switch,
 * so a record re-created in its place keeps both.
 */
export async function deleteLinkedRecord(
  spreadsheetId: string,
  formType: 'income' | 'expense',
  recordId: string
): Promise<LinkedRecordWallet> {
  const none = { walletAccount: '', walletApply: '' }

  if (!recordId) return none

  const form = getFormByType(formType)

  if (!form) return none

  const records = await fetchRecords(spreadsheetId, form)

  const match = records.find(r => r.id === recordId)

  if (!match) return none

  await deleteRecord(spreadsheetId, form, match.rowNumber, match.sheetName)
  await applyWalletChanges(
    spreadsheetId,
    walletEffectOf(formType, match.values),
    null,
    recordLedgerContext(match.values, 'حذف', match.id)
  )

  return {
    walletAccount: match.values[WALLET_ACCOUNT_FIELD_ID] ?? '',
    walletApply: match.values[WALLET_APPLY_FIELD_ID] ?? ''
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
