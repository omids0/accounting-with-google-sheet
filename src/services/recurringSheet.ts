import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { recurringToRow, rowToRecurring } from './recurring'
import { validateRecurringCsvCells } from './recurringCsvValidate'
import { RECURRING_HEADERS } from './sheetHeaders'
import { RECURRING_SHEET } from './sheetNames'
import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRangeFromApi,
  fetchSheetRows,
  updateSheetRow
} from './sheets'
import { isSharedWorkspace } from './workspace'
import type { RecurringItem } from '../types'

export type SheetRecurringItem = RecurringItem & { rowNumber: number }

export const SHARED_NO_RECURRING_MESSAGE = 'تکرار ماهانه در حساب مشترک نیست'

/** A shared account has no recurring items in v1 (spec non-goals); its tab stays untouched. */
function refuseShared(spreadsheetId: string): void {
  if (isSharedWorkspace(spreadsheetId)) throw new Error(SHARED_NO_RECURRING_MESSAGE)
}

function parseRows(rows: string[][]): SheetRecurringItem[] {
  return rows.flatMap((row, index) => {
    const item = rowToRecurring(row)

    return item ? [{ ...item, rowNumber: index + 2 }] : []
  })
}

/** Every item of «تکرارها»; empty before the tab exists. */
export async function fetchRecurringItems(spreadsheetId: string): Promise<SheetRecurringItem[]> {
  try {
    return parseRows(await fetchSheetRows(spreadsheetId, RECURRING_SHEET))
  } catch {
    return []
  }
}

/**
 * The tab as Google Sheets has it right now (not the local mirror), for the auto-post
 * guard. Throws when it cannot be read, so nothing is posted offline.
 */
export async function fetchRemoteRecurringItems(spreadsheetId: string): Promise<RecurringItem[]> {
  const rows = await fetchSheetRangeFromApi(spreadsheetId, RECURRING_SHEET)

  return parseRows(rows.slice(1))
}

export function stripRow({ rowNumber: _, ...item }: SheetRecurringItem): RecurringItem {
  return item
}

async function findRowNumber(spreadsheetId: string, id: string): Promise<number | null> {
  const current = (await fetchRecurringItems(spreadsheetId)).find(item => item.id === id)

  return current?.rowNumber ?? null
}

/** Updates the item's row (found by id), or appends a new one. */
export async function saveRecurringItem(spreadsheetId: string, item: RecurringItem): Promise<void> {
  refuseShared(spreadsheetId)
  await ensureSheetWithHeaders(spreadsheetId, RECURRING_SHEET, RECURRING_HEADERS)

  const rowNumber = await findRowNumber(spreadsheetId, item.id)
  const row = recurringToRow(item)

  if (rowNumber) await updateSheetRow(spreadsheetId, RECURRING_SHEET, rowNumber, row)
  else await appendSheetRow(spreadsheetId, RECURRING_SHEET, row)
}

export async function deleteRecurringItem(spreadsheetId: string, id: string): Promise<void> {
  refuseShared(spreadsheetId)

  const rowNumber = await findRowNumber(spreadsheetId, id)

  if (rowNumber) await deleteSheetRow(spreadsheetId, RECURRING_SHEET, rowNumber)
}

export async function exportRecurringCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, RECURRING_SHEET, RECURRING_HEADERS, 'تکرارها.csv')
}

export async function importRecurringCsv(spreadsheetId: string, csvContent: string) {
  refuseShared(spreadsheetId)

  return importSheetCsv(spreadsheetId, RECURRING_SHEET, RECURRING_HEADERS, csvContent, cells => {
    const item = rowToRecurring([
      newImportId(cells[0] ?? ''),
      newImportTimestamp(cells[1] ?? ''),
      ...validateRecurringCsvCells(cells).slice(2)
    ])

    return item ? recurringToRow(item) : null
  })
}
