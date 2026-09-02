import type { Timesheet, TimesheetEntry } from '../types'
import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import {
  TIMESHEET_ENTRIES_HEADERS,
  TIMESHEET_ENTRIES_SHEET,
  TIMESHEETS_HEADERS,
  TIMESHEETS_SHEET,
  rowToTimesheet,
  rowToTimesheetEntry,
  sortTimesheetEntries,
  sortTimesheets,
  timesheetEntryToRow,
  timesheetToRow
} from './timesheetRow'
import { calcDurationMinutes } from '../utils/datetime'

export {
  TIMESHEETS_SHEET,
  TIMESHEET_ENTRIES_SHEET,
  TIMESHEETS_HEADERS,
  TIMESHEET_ENTRIES_HEADERS,
  sortTimesheets,
  sortTimesheetEntries,
  totalDurationMinutes
} from './timesheetRow'

export async function ensureTimesheetsSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, TIMESHEETS_SHEET, TIMESHEETS_HEADERS)
}

export async function ensureTimesheetEntriesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, TIMESHEET_ENTRIES_SHEET, TIMESHEET_ENTRIES_HEADERS)
}

export async function fetchTimesheets(
  spreadsheetId: string
): Promise<(Timesheet & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, TIMESHEETS_SHEET)

  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToTimesheet(row, rowNumber))

  return sortTimesheets(items)
}

export async function fetchTimesheetEntries(
  spreadsheetId: string,
  timesheetId?: string
): Promise<(TimesheetEntry & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, TIMESHEET_ENTRIES_SHEET)

  const items = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .filter(({ row }) => !timesheetId || row[1] === timesheetId)
    .map(({ row, rowNumber }) => rowToTimesheetEntry(row, rowNumber))

  return sortTimesheetEntries(items)
}

export async function createTimesheet(
  spreadsheetId: string,
  data: { title: string; description?: string }
): Promise<Timesheet> {
  const timesheet: Timesheet = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title.trim(),
    description: data.description?.trim() ?? ''
  }

  await appendSheetRow(spreadsheetId, TIMESHEETS_SHEET, timesheetToRow(timesheet))

  return timesheet
}

export async function updateTimesheet(
  spreadsheetId: string,
  rowNumber: number,
  timesheet: Timesheet
): Promise<void> {
  await updateSheetRow(spreadsheetId, TIMESHEETS_SHEET, rowNumber, timesheetToRow(timesheet))
}

export async function deleteTimesheet(
  spreadsheetId: string,
  rowNumber: number,
  timesheetId: string
): Promise<void> {
  const entries = await fetchTimesheetEntries(spreadsheetId, timesheetId)

  for (const entry of entries) {
    await deleteSheetRow(spreadsheetId, TIMESHEET_ENTRIES_SHEET, entry.rowNumber)
  }
  await deleteSheetRow(spreadsheetId, TIMESHEETS_SHEET, rowNumber)
}

export async function createTimesheetEntry(
  spreadsheetId: string,
  data: {
    timesheetId: string
    title: string
    startAt: string
    endAt: string
    description: string
  }
): Promise<TimesheetEntry> {
  const durationMinutes = calcDurationMinutes(data.startAt, data.endAt)

  const entry: TimesheetEntry = {
    id: crypto.randomUUID(),
    timesheetId: data.timesheetId,
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title.trim(),
    startAt: data.startAt,
    endAt: data.endAt,
    durationMinutes,
    description: data.description.trim(),
    checked: false
  }

  await appendSheetRow(spreadsheetId, TIMESHEET_ENTRIES_SHEET, timesheetEntryToRow(entry))

  return entry
}

export async function updateTimesheetEntry(
  spreadsheetId: string,
  rowNumber: number,
  entry: TimesheetEntry
): Promise<void> {
  const updated: TimesheetEntry = {
    ...entry,
    durationMinutes: calcDurationMinutes(entry.startAt, entry.endAt)
  }

  await updateSheetRow(
    spreadsheetId,
    TIMESHEET_ENTRIES_SHEET,
    rowNumber,
    timesheetEntryToRow(updated)
  )
}

export async function deleteTimesheetEntry(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, TIMESHEET_ENTRIES_SHEET, rowNumber)
}
