import type { Dang } from '../types';
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
} from './sheets';

export const DANG_SHEET = 'دنگ';

export const DANG_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'طرف حساب',
  'مبلغ',
  'تاریخ',
  'توضیحات',
  'پرداخت شده',
  'زمان پرداخت',
];

function parsePaid(raw: string): boolean {
  const v = String(raw ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'بله' || v === 'yes';
}

function rowToDang(row: string[], rowNumber: number): Dang & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    counterparty: row[3] ?? '',
    amount: Number(row[4]) || 0,
    date: row[5] ?? '',
    note: row[6] ?? '',
    paid: parsePaid(row[7] ?? ''),
    paidAt: row[8] ?? '',
  };
}

function dangToRow(dang: Dang): string[] {
  return [
    dang.id,
    dang.createdAt,
    dang.title,
    dang.counterparty,
    String(dang.amount),
    dang.date,
    dang.note,
    dang.paid ? 'بله' : 'خیر',
    dang.paidAt,
  ];
}

export function sortDangs<T extends Dang>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    return (b.date || '').localeCompare(a.date || '');
  });
}

export async function ensureDangSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, DANG_SHEET, DANG_HEADERS);
}

export async function fetchDangs(
  spreadsheetId: string
): Promise<(Dang & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, DANG_SHEET);
  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToDang(row, rowNumber));
  return sortDangs(items);
}

export async function createDang(
  spreadsheetId: string,
  data: {
    title: string;
    counterparty: string;
    amount: number;
    date: string;
    note: string;
  }
): Promise<Dang> {
  const dang: Dang = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    counterparty: data.counterparty,
    amount: data.amount,
    date: data.date,
    note: data.note,
    paid: false,
    paidAt: '',
  };

  await appendSheetRow(spreadsheetId, DANG_SHEET, dangToRow(dang));
  return dang;
}

export async function updateDang(
  spreadsheetId: string,
  rowNumber: number,
  dang: Dang
): Promise<void> {
  await updateSheetRow(spreadsheetId, DANG_SHEET, rowNumber, dangToRow(dang));
}

export async function toggleDangPaid(
  spreadsheetId: string,
  dang: Dang & { rowNumber: number },
  paid: boolean
): Promise<Dang> {
  const updated: Dang = {
    ...dang,
    paid,
    paidAt: paid ? new Date().toLocaleString('fa-IR') : '',
  };
  await updateDang(spreadsheetId, dang.rowNumber, updated);
  return updated;
}

export function unpaidDangTotal(items: Dang[]): number {
  return items.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0);
}
