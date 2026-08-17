import type { Receivable, ReceivablePayment } from '../types';
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow,
} from './sheets';
import { getTodayIso } from '../utils/jalaliDate';
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport';

export const RECEIVABLES_SHEET = 'طلب‌ها';

export const RECEIVABLES_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'نام',
  'مبلغ',
  'تاریخ قرض',
  'توضیحات',
  'پرداخت‌ها',
];

function parsePayments(raw: string): ReceivablePayment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ReceivablePayment[];
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* use default */
  }
  return [];
}

function rowToReceivable(
  row: string[],
  rowNumber: number
): Receivable & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    debtor: row[2] ?? '',
    amount: Number(row[3]) || 0,
    borrowDate: row[4] ?? '',
    note: row[5] ?? '',
    payments: parsePayments(row[6] ?? ''),
  };
}

function receivableToRow(receivable: Receivable): string[] {
  return [
    receivable.id,
    receivable.createdAt,
    receivable.debtor,
    String(receivable.amount),
    receivable.borrowDate,
    receivable.note,
    JSON.stringify(receivable.payments),
  ];
}

export function paidAmount(receivable: Receivable): number {
  return receivable.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function remainingAmount(receivable: Receivable): number {
  return Math.max(0, receivable.amount - paidAmount(receivable));
}

export function isReceivableComplete(receivable: Receivable): boolean {
  return remainingAmount(receivable) <= 0;
}

export function sortReceivables<T extends Receivable>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aComplete = isReceivableComplete(a);
    const bComplete = isReceivableComplete(b);
    if (aComplete !== bComplete) return aComplete ? 1 : -1;
    return (b.borrowDate || '').localeCompare(a.borrowDate || '');
  });
}

export async function ensureReceivablesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(
    spreadsheetId,
    RECEIVABLES_SHEET,
    RECEIVABLES_HEADERS
  );
}

export async function fetchReceivables(
  spreadsheetId: string
): Promise<(Receivable & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, RECEIVABLES_SHEET);
  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToReceivable(row, rowNumber));
  return sortReceivables(items);
}

export async function createReceivable(
  spreadsheetId: string,
  data: {
    debtor: string;
    amount: number;
    borrowDate: string;
    note: string;
  }
): Promise<Receivable> {
  const receivable: Receivable = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    debtor: data.debtor,
    amount: data.amount,
    borrowDate: data.borrowDate,
    note: data.note,
    payments: [],
  };

  await appendSheetRow(spreadsheetId, RECEIVABLES_SHEET, receivableToRow(receivable));
  return receivable;
}

export async function addReceivablePayment(
  spreadsheetId: string,
  receivable: Receivable & { rowNumber: number },
  payment: { amount: number; note?: string }
): Promise<Receivable> {
  const newPayment: ReceivablePayment = {
    id: crypto.randomUUID(),
    amount: payment.amount,
    paidAt: getTodayIso(),
    note: payment.note ?? '',
  };

  const updated: Receivable = {
    ...receivable,
    payments: [...receivable.payments, newPayment],
  };

  await updateSheetRow(
    spreadsheetId,
    RECEIVABLES_SHEET,
    receivable.rowNumber,
    receivableToRow(updated)
  );
  return updated;
}

export async function updateReceivable(
  spreadsheetId: string,
  rowNumber: number,
  receivable: Receivable
): Promise<void> {
  await updateSheetRow(
    spreadsheetId,
    RECEIVABLES_SHEET,
    rowNumber,
    receivableToRow(receivable)
  );
}

export async function deleteReceivable(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, RECEIVABLES_SHEET, rowNumber);
}

export async function exportReceivablesCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(
    spreadsheetId,
    RECEIVABLES_SHEET,
    RECEIVABLES_HEADERS,
    'طلب‌ها.csv'
  );
}

export async function importReceivablesCsv(
  spreadsheetId: string,
  csvContent: string
) {
  return importSheetCsv(
    spreadsheetId,
    RECEIVABLES_SHEET,
    RECEIVABLES_HEADERS,
    csvContent,
    (cells) => {
      const debtor = (cells[2] ?? '').trim();
      if (!debtor) return null;
      return receivableToRow({
        id: newImportId(cells[0] ?? ''),
        createdAt: newImportTimestamp(cells[1] ?? ''),
        debtor,
        amount: Number(cells[3]) || 0,
        borrowDate: cells[4] ?? '',
        note: cells[5] ?? '',
        payments: parsePayments(cells[6] ?? ''),
      });
    }
  );
}
