import type { Check } from '../types';
import type { DateRange } from '../utils/dateRange';
import { isDateInRange } from '../utils/dateRange';
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow,
} from './sheets';

export const CHECKS_SHEET = 'چک‌ها';

export const CHECKS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'شماره چک',
  'طرف حساب',
  'مبلغ',
  'تاریخ صدور',
  'تاریخ سررسید',
  'پرداخت شده',
  'زمان پرداخت',
];

function parsePaid(raw: string): boolean {
  const v = String(raw ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'بله' || v === 'yes';
}

function rowToCheck(row: string[], rowNumber: number): Check & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    checkNumber: row[2] ?? '',
    counterparty: row[3] ?? '',
    amount: Number(row[4]) || 0,
    creationDate: row[5] ?? '',
    dueDate: row[6] ?? '',
    paid: parsePaid(row[7] ?? ''),
    paidAt: row[8] ?? '',
  };
}

function checkToRow(check: Check): string[] {
  return [
    check.id,
    check.createdAt,
    check.checkNumber,
    check.counterparty,
    String(check.amount),
    check.creationDate,
    check.dueDate,
    check.paid ? 'بله' : 'خیر',
    check.paidAt,
  ];
}

export function sortChecks<T extends Check>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });
}

export async function ensureChecksSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, CHECKS_SHEET, CHECKS_HEADERS);
}

export async function fetchChecks(
  spreadsheetId: string
): Promise<(Check & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, CHECKS_SHEET);
  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToCheck(row, rowNumber));
  return sortChecks(items);
}

export async function createCheck(
  spreadsheetId: string,
  data: {
    checkNumber: string;
    counterparty: string;
    amount: number;
    creationDate: string;
    dueDate: string;
  }
): Promise<Check> {
  const check: Check = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    checkNumber: data.checkNumber,
    counterparty: data.counterparty,
    amount: data.amount,
    creationDate: data.creationDate,
    dueDate: data.dueDate,
    paid: false,
    paidAt: '',
  };

  await appendSheetRow(spreadsheetId, CHECKS_SHEET, checkToRow(check));
  return check;
}

export async function updateCheck(
  spreadsheetId: string,
  rowNumber: number,
  check: Check
): Promise<void> {
  await updateSheetRow(spreadsheetId, CHECKS_SHEET, rowNumber, checkToRow(check));
}

export async function deleteCheck(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, CHECKS_SHEET, rowNumber);
}

export async function toggleCheckPaid(
  spreadsheetId: string,
  check: Check & { rowNumber: number },
  paid: boolean
): Promise<Check> {
  const updated: Check = {
    ...check,
    paid,
    paidAt: paid ? new Date().toLocaleString('fa-IR') : '',
  };
  await updateCheck(spreadsheetId, check.rowNumber, updated);
  return updated;
}

export function totalChecksInRange(checks: Check[], range: DateRange): number {
  return checks
    .filter((c) => isDateInRange(c.dueDate, range))
    .reduce((sum, c) => sum + c.amount, 0);
}

export function totalUnpaidChecksInRange(checks: Check[], range: DateRange): number {
  return checks
    .filter((c) => !c.paid && isDateInRange(c.dueDate, range))
    .reduce((sum, c) => sum + c.amount, 0);
}
