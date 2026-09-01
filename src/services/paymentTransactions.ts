import type { CustomForm } from '../types';
import {
  appendRecord,
  deleteRecord,
  ensureFormSheet,
  fetchRecords,
} from './sheets';
import { getSettings } from './settings';
import { getTodayIso } from '../utils/jalaliDate';

function getFormByType(type: 'income' | 'expense'): CustomForm | undefined {
  return getSettings()?.forms.find((f) => f.type === type);
}

function resolveCategory(form: CustomForm, category?: string): string {
  if (category?.trim()) return category.trim();
  const options = form.fields.find((f) => f.id === 'category')?.options ?? [];
  return options[0] ?? 'سایر';
}

export async function createLinkedExpenseRecord(
  spreadsheetId: string,
  params: {
    title: string;
    amount: number;
    category?: string;
    note?: string;
    date?: string;
  }
): Promise<string> {
  const expenseForm = getFormByType('expense');
  if (!expenseForm) throw new Error('فرم هزینه پیدا نشد');

  await ensureFormSheet(spreadsheetId, expenseForm);
  const recordId = crypto.randomUUID();
  const createdAt = new Date().toLocaleString('fa-IR');
  const date = params.date ?? getTodayIso();

  await appendRecord(spreadsheetId, expenseForm, recordId, createdAt, {
    date,
    title: params.title,
    category: resolveCategory(expenseForm, params.category),
    amount: params.amount,
    note: params.note ?? '',
  });

  return recordId;
}

export async function createLinkedIncomeRecord(
  spreadsheetId: string,
  params: {
    title: string;
    amount: number;
    category?: string;
    note?: string;
    date?: string;
  }
): Promise<string> {
  const incomeForm = getFormByType('income');
  if (!incomeForm) throw new Error('فرم درآمد پیدا نشد');

  await ensureFormSheet(spreadsheetId, incomeForm);
  const recordId = crypto.randomUUID();
  const createdAt = new Date().toLocaleString('fa-IR');
  const date = params.date ?? getTodayIso();

  await appendRecord(spreadsheetId, incomeForm, recordId, createdAt, {
    date,
    title: params.title,
    category: resolveCategory(incomeForm, params.category),
    amount: params.amount,
    note: params.note ?? '',
  });

  return recordId;
}

export async function deleteLinkedRecord(
  spreadsheetId: string,
  formType: 'income' | 'expense',
  recordId: string
): Promise<void> {
  if (!recordId) return;

  const form = getFormByType(formType);
  if (!form) return;

  const records = await fetchRecords(spreadsheetId, form);
  const match = records.find((r) => r.id === recordId);
  if (match) {
    await deleteRecord(spreadsheetId, form, match.rowNumber);
  }
}

export async function deleteLinkedExpenseRecord(
  spreadsheetId: string,
  recordId: string
): Promise<void> {
  await deleteLinkedRecord(spreadsheetId, 'expense', recordId);
}

export async function deleteLinkedIncomeRecord(
  spreadsheetId: string,
  recordId: string
): Promise<void> {
  await deleteLinkedRecord(spreadsheetId, 'income', recordId);
}
