import type { Timesheet, TimesheetEntry } from '../types'
import { calcDurationMinutes, normalizeDateTimeIso } from '../utils/datetime'

export const TIMESHEETS_SHEET = 'تایم‌شیت‌ها'
export const TIMESHEET_ENTRIES_SHEET = 'رکوردهای تایم‌شیت'

export const TIMESHEETS_HEADERS = ['شناسه', 'زمان ثبت', 'عنوان', 'توضیحات']

export const TIMESHEET_ENTRIES_HEADERS = [
  'شناسه',
  'شناسه تایم‌شیت',
  'زمان ثبت',
  'عنوان',
  'شروع',
  'پایان',
  'مدت (دقیقه)',
  'توضیحات',
  'تایید شده'
]

function parseChecked(raw: string): boolean {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()

  return value === 'true' || value === '1' || value === 'yes' || value === 'بله'
}

export function rowToTimesheet(
  row: string[],
  rowNumber: number
): Timesheet & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    description: row[3] ?? ''
  }
}

export function timesheetToRow(timesheet: Timesheet): string[] {
  return [timesheet.id, timesheet.createdAt, timesheet.title, timesheet.description]
}

export function rowToTimesheetEntry(
  row: string[],
  rowNumber: number
): TimesheetEntry & { rowNumber: number } {
  return {
    rowNumber,
    id: row[0] ?? '',
    timesheetId: row[1] ?? '',
    createdAt: row[2] ?? '',
    title: row[3] ?? '',
    startAt: normalizeDateTimeIso(row[4] ?? '') || String(row[4] ?? '').trim(),
    endAt: normalizeDateTimeIso(row[5] ?? '') || String(row[5] ?? '').trim(),
    durationMinutes: Number(row[6]) || 0,
    description: row[7] ?? '',
    checked: parseChecked(row[8] ?? '')
  }
}

export function timesheetEntryToRow(entry: TimesheetEntry): string[] {
  return [
    entry.id,
    entry.timesheetId,
    entry.createdAt,
    entry.title,
    entry.startAt,
    entry.endAt,
    String(entry.durationMinutes),
    entry.description,
    entry.checked ? 'true' : 'false'
  ]
}

export function sortTimesheets<T extends Timesheet>(items: T[]): T[] {
  return [...items].sort((a, b) => a.title.localeCompare(b.title, 'fa'))
}

export function sortTimesheetEntries<T extends TimesheetEntry>(items: T[]): T[] {
  return [...items].sort((a, b) => b.startAt.localeCompare(a.startAt))
}

export function totalDurationMinutes(entries: TimesheetEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0)
}

export function buildTimesheetEntryFromImport(
  cells: string[],
  timesheetId: string
): TimesheetEntry | null {
  const title = (cells[3] ?? '').trim()

  const startAt = (cells[4] ?? '').trim()

  const endAt = (cells[5] ?? '').trim()

  if (!title || !startAt || !endAt) return null

  const entry: TimesheetEntry = {
    id: cells[0] ?? '',
    timesheetId: timesheetId || (cells[1] ?? '').trim(),
    createdAt: cells[2] ?? '',
    title,
    startAt,
    endAt,
    durationMinutes: calcDurationMinutes(startAt, endAt),
    description: cells[7] ?? '',
    checked: parseChecked(cells[8] ?? '')
  }

  if (!entry.timesheetId) return null

  return entry
}
