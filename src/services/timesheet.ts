import type { Timesheet, TimesheetEntry } from '../types';
import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
} from './sheets';
import { calcDurationMinutes, formatDateTimePersian, formatDurationFa } from '../utils/datetime';
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport';
import { downloadTablePdf } from '../utils/pdf';
import { formatPersianDate } from '../utils/pdfFormat';

export const TIMESHEETS_SHEET = 'تایم‌شیت‌ها';
export const TIMESHEET_ENTRIES_SHEET = 'رکوردهای تایم‌شیت';

export const TIMESHEETS_HEADERS = ['شناسه', 'زمان ثبت', 'عنوان', 'توضیحات'];

export const TIMESHEET_ENTRIES_HEADERS = [
  'شناسه',
  'شناسه تایم‌شیت',
  'زمان ثبت',
  'عنوان',
  'شروع',
  'پایان',
  'مدت (دقیقه)',
  'توضیحات',
];

function rowToTimesheet(row: string[], rowNumber: number): Timesheet & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    description: row[3] ?? '',
  };
}

function timesheetToRow(timesheet: Timesheet): string[] {
  return [timesheet.id, timesheet.createdAt, timesheet.title, timesheet.description];
}

function rowToTimesheetEntry(
  row: string[],
  rowNumber: number
): TimesheetEntry & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    timesheetId: row[1] ?? '',
    createdAt: row[2] ?? '',
    title: row[3] ?? '',
    startAt: row[4] ?? '',
    endAt: row[5] ?? '',
    durationMinutes: Number(row[6]) || 0,
    description: row[7] ?? '',
  };
}

function timesheetEntryToRow(entry: TimesheetEntry): string[] {
  return [
    entry.id,
    entry.timesheetId,
    entry.createdAt,
    entry.title,
    entry.startAt,
    entry.endAt,
    String(entry.durationMinutes),
    entry.description,
  ];
}

export function sortTimesheets<T extends Timesheet>(items: T[]): T[] {
  return [...items].sort((a, b) => a.title.localeCompare(b.title, 'fa'));
}

export function sortTimesheetEntries<T extends TimesheetEntry>(items: T[]): T[] {
  return [...items].sort((a, b) => b.startAt.localeCompare(a.startAt));
}

export function totalDurationMinutes(entries: TimesheetEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
}

export async function ensureTimesheetsSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, TIMESHEETS_SHEET, TIMESHEETS_HEADERS);
}

export async function ensureTimesheetEntriesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(
    spreadsheetId,
    TIMESHEET_ENTRIES_SHEET,
    TIMESHEET_ENTRIES_HEADERS
  );
}

export async function fetchTimesheets(
  spreadsheetId: string
): Promise<(Timesheet & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, TIMESHEETS_SHEET);
  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToTimesheet(row, rowNumber));
  return sortTimesheets(items);
}

export async function fetchTimesheetEntries(
  spreadsheetId: string,
  timesheetId?: string
): Promise<(TimesheetEntry & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, TIMESHEET_ENTRIES_SHEET);
  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .filter(({ row }) => !timesheetId || row[1] === timesheetId)
    .map(({ row, rowNumber }) => rowToTimesheetEntry(row, rowNumber));
  return sortTimesheetEntries(items);
}

export async function createTimesheet(
  spreadsheetId: string,
  data: { title: string; description?: string }
): Promise<Timesheet> {
  const timesheet: Timesheet = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title.trim(),
    description: data.description?.trim() ?? '',
  };
  await appendSheetRow(spreadsheetId, TIMESHEETS_SHEET, timesheetToRow(timesheet));
  return timesheet;
}

export async function updateTimesheet(
  spreadsheetId: string,
  rowNumber: number,
  timesheet: Timesheet
): Promise<void> {
  await updateSheetRow(spreadsheetId, TIMESHEETS_SHEET, rowNumber, timesheetToRow(timesheet));
}

export async function deleteTimesheet(
  spreadsheetId: string,
  rowNumber: number,
  timesheetId: string
): Promise<void> {
  const entries = await fetchTimesheetEntries(spreadsheetId, timesheetId);
  for (const entry of entries) {
    await deleteSheetRow(spreadsheetId, TIMESHEET_ENTRIES_SHEET, entry.rowNumber);
  }
  await deleteSheetRow(spreadsheetId, TIMESHEETS_SHEET, rowNumber);
}

export async function createTimesheetEntry(
  spreadsheetId: string,
  data: {
    timesheetId: string;
    title: string;
    startAt: string;
    endAt: string;
    description: string;
  }
): Promise<TimesheetEntry> {
  const durationMinutes = calcDurationMinutes(data.startAt, data.endAt);
  const entry: TimesheetEntry = {
    id: crypto.randomUUID(),
    timesheetId: data.timesheetId,
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title.trim(),
    startAt: data.startAt,
    endAt: data.endAt,
    durationMinutes,
    description: data.description.trim(),
  };
  await appendSheetRow(spreadsheetId, TIMESHEET_ENTRIES_SHEET, timesheetEntryToRow(entry));
  return entry;
}

export async function updateTimesheetEntry(
  spreadsheetId: string,
  rowNumber: number,
  entry: TimesheetEntry
): Promise<void> {
  const updated: TimesheetEntry = {
    ...entry,
    durationMinutes: calcDurationMinutes(entry.startAt, entry.endAt),
  };
  await updateSheetRow(
    spreadsheetId,
    TIMESHEET_ENTRIES_SHEET,
    rowNumber,
    timesheetEntryToRow(updated)
  );
}

export async function deleteTimesheetEntry(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, TIMESHEET_ENTRIES_SHEET, rowNumber);
}

export async function exportTimesheetsCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(
    spreadsheetId,
    TIMESHEETS_SHEET,
    TIMESHEETS_HEADERS,
    'تایم‌شیت‌ها.csv'
  );
}

export async function exportTimesheetEntriesCsv(
  spreadsheetId: string,
  timesheetId: string,
  filename: string
): Promise<void> {
  const rows = await fetchSheetRows(spreadsheetId, TIMESHEET_ENTRIES_SHEET);
  const filtered = rows.filter((row) => row[1] === timesheetId);
  const csvRows = [TIMESHEET_ENTRIES_HEADERS, ...filtered];
  const content = csvRows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
          return value;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportTimesheetsPdf(spreadsheetId: string): Promise<void> {
  const items = sortTimesheets(await fetchTimesheets(spreadsheetId));
  const headers = ['عنوان', 'توضیحات', 'زمان ثبت'];
  const rows = items.map((item) => [item.title, item.description, item.createdAt]);
  await downloadTablePdf({
    title: 'گزارش تایم‌شیت‌ها',
    headers,
    rows,
    filename: 'تایم‌شیت‌ها.pdf',
  });
}

export async function exportTimesheetEntriesPdf(
  spreadsheetId: string,
  timesheetId: string,
  timesheetTitle: string
): Promise<void> {
  const entries = await fetchTimesheetEntries(spreadsheetId, timesheetId);
  const totalMinutes = totalDurationMinutes(entries);
  const headers = ['عنوان', 'شروع', 'پایان', 'مدت', 'توضیحات'];
  const rows = entries.map((entry) => [
    entry.title,
    formatDateTimePersian(entry.startAt),
    formatDateTimePersian(entry.endAt),
    formatDurationFa(entry.durationMinutes),
    entry.description,
  ]);
  rows.push(['', '', 'جمع کل', formatDurationFa(totalMinutes), '']);

  await downloadTablePdf({
    title: `گزارش تایم‌شیت: ${timesheetTitle}`,
    headers,
    rows,
    filename: `${timesheetTitle}.pdf`,
  });
}

export async function importTimesheetsCsv(
  spreadsheetId: string,
  csvContent: string
) {
  return importSheetCsv(
    spreadsheetId,
    TIMESHEETS_SHEET,
    TIMESHEETS_HEADERS,
    csvContent,
    (cells) => {
      const title = (cells[2] ?? '').trim();
      if (!title) return null;
      return timesheetToRow({
        id: newImportId(cells[0] ?? ''),
        createdAt: newImportTimestamp(cells[1] ?? ''),
        title,
        description: cells[3] ?? '',
      });
    }
  );
}

export async function importTimesheetEntriesCsv(
  spreadsheetId: string,
  timesheetId: string,
  csvContent: string
) {
  return importSheetCsv(
    spreadsheetId,
    TIMESHEET_ENTRIES_SHEET,
    TIMESHEET_ENTRIES_HEADERS,
    csvContent,
    (cells) => {
      const title = (cells[3] ?? '').trim();
      const startAt = (cells[4] ?? '').trim();
      const endAt = (cells[5] ?? '').trim();
      if (!title || !startAt || !endAt) return null;
      const entry: TimesheetEntry = {
        id: newImportId(cells[0] ?? ''),
        timesheetId: timesheetId || (cells[1] ?? '').trim(),
        createdAt: newImportTimestamp(cells[2] ?? ''),
        title,
        startAt,
        endAt,
        durationMinutes: calcDurationMinutes(startAt, endAt),
        description: cells[7] ?? '',
      };
      if (!entry.timesheetId) return null;
      return timesheetEntryToRow(entry);
    }
  );
}

export function formatEntryDateForPdf(iso: string): string {
  return formatPersianDate(iso.slice(0, 10));
}
