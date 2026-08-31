import type { Dang } from '../types';
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow,
} from './sheets';
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport';
import { downloadTablePdf } from '../utils/pdf';
import { formatMoney } from '../utils/formatMoney';
import { formatPaidStatus, formatPersianDate } from '../utils/pdfFormat';
import {
  createLinkedExpenseRecord,
  deleteLinkedExpenseRecord,
} from './paymentTransactions';

export const DANG_SHEET = 'دنگ';

export const DANG_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'دسته‌بندی',
  'طرف حساب',
  'مبلغ',
  'تاریخ',
  'توضیحات',
  'پرداخت شده',
  'زمان پرداخت',
  'شناسه تراکنش',
];

function parsePaid(raw: string): boolean {
  const v = String(raw ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'بله' || v === 'yes';
}

function isLegacyDangRow(row: string[]): boolean {
  const amountAt4 = Number(row[4]);
  return row[4] !== '' && !Number.isNaN(amountAt4);
}

function rowToDang(row: string[], rowNumber: number): Dang & { rowNumber: number } {
  if (isLegacyDangRow(row)) {
    return {
      rowNumber,
      id: row[0] ?? '',
      createdAt: row[1] ?? '',
      title: row[2] ?? '',
      category: 'سایر',
      counterparty: row[3] ?? '',
      amount: Number(row[4]) || 0,
      date: row[5] ?? '',
      note: row[6] ?? '',
      paid: parsePaid(row[7] ?? ''),
      paidAt: row[8] ?? '',
      transactionRecordId: '',
    };
  }

  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    category: row[3] ?? 'سایر',
    counterparty: row[4] ?? '',
    amount: Number(row[5]) || 0,
    date: row[6] ?? '',
    note: row[7] ?? '',
    paid: parsePaid(row[8] ?? ''),
    paidAt: row[9] ?? '',
    transactionRecordId: row[10] ?? '',
  };
}

function dangToRow(dang: Dang): string[] {
  return [
    dang.id,
    dang.createdAt,
    dang.title,
    dang.category,
    dang.counterparty,
    String(dang.amount),
    dang.date,
    dang.note,
    dang.paid ? 'بله' : 'خیر',
    dang.paidAt,
    dang.transactionRecordId ?? '',
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
    category: string;
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
    category: data.category,
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

export async function deleteDang(
  spreadsheetId: string,
  rowNumber: number,
  dang?: Dang
): Promise<void> {
  if (dang?.transactionRecordId) {
    await deleteLinkedExpenseRecord(spreadsheetId, dang.transactionRecordId);
  }
  await deleteSheetRow(spreadsheetId, DANG_SHEET, rowNumber);
}

export async function toggleDangPaid(
  spreadsheetId: string,
  dang: Dang & { rowNumber: number },
  paid: boolean
): Promise<Dang> {
  if (paid && !dang.paid) {
    const transactionRecordId = await createLinkedExpenseRecord(spreadsheetId, {
      title: `بدهی: ${dang.title}`,
      amount: dang.amount,
      category: dang.category,
      note: dang.note,
    });
    const updated: Dang = {
      ...dang,
      paid: true,
      paidAt: new Date().toLocaleString('fa-IR'),
      transactionRecordId,
    };
    await updateDang(spreadsheetId, dang.rowNumber, updated);
    return updated;
  }

  if (!paid && dang.paid) {
    if (dang.transactionRecordId) {
      await deleteLinkedExpenseRecord(spreadsheetId, dang.transactionRecordId);
    }
    const updated: Dang = {
      ...dang,
      paid: false,
      paidAt: '',
      transactionRecordId: '',
    };
    await updateDang(spreadsheetId, dang.rowNumber, updated);
    return updated;
  }

  return dang;
}

export function unpaidDangTotal(items: Dang[]): number {
  return items.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0);
}

export async function exportDangsCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(spreadsheetId, DANG_SHEET, DANG_HEADERS, 'بدهی.csv');
}

export async function exportDangsPdf(spreadsheetId: string): Promise<void> {
  const items = sortDangs(await fetchDangs(spreadsheetId));
  const headers = [
    'عنوان',
    'دسته‌بندی',
    'طرف حساب',
    'مبلغ',
    'تاریخ',
    'وضعیت',
    'توضیحات',
  ];
  const rows = items.map((item) => [
    item.title,
    item.category,
    item.counterparty,
    formatMoney(item.amount),
    formatPersianDate(item.date),
    formatPaidStatus(item.paid),
    item.note,
  ]);
  const cellClasses = items.map(() => [
    '',
    '',
    '',
    'pdf-cell-amount',
    '',
    '',
    '',
  ]);

  await downloadTablePdf({
    title: 'گزارش بدهی‌ها',
    headers,
    rows,
    filename: 'بدهی.pdf',
    cellClasses,
  });
}

export async function importDangsCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(
    spreadsheetId,
    DANG_SHEET,
    DANG_HEADERS,
    csvContent,
    (cells) => {
      const title = (cells[2] ?? '').trim();
      if (!title) return null;
      return dangToRow({
        id: newImportId(cells[0] ?? ''),
        createdAt: newImportTimestamp(cells[1] ?? ''),
        title,
        category: cells[3] ?? 'سایر',
        counterparty: cells[4] ?? '',
        amount: Number(cells[5]) || 0,
        date: cells[6] ?? '',
        note: cells[7] ?? '',
        paid: parsePaid(cells[8] ?? ''),
        paidAt: cells[9] ?? '',
        transactionRecordId: cells[10] ?? '',
      });
    }
  );
}
