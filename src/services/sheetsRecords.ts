import type { CustomForm } from '../types'
import { buildFieldColumnMap, buildHeaders, buildRecordRow, mapRowToValues } from './sheetsHeaders'
import { fetchSheetRangeFromApi, deleteSheetRow, updateSheetRow } from './sheetsRows'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { appendSheetDataRow, getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import type { OutboxWriteOptions } from './syncOutbox'
import { cellToString, isSheetHeaderRow } from '../utils/sheetValues'

export type SheetWriteOptions = OutboxWriteOptions

export type SheetRecord = {
  id: string
  createdAt: string
  rowNumber: number
  values: Record<string, string>
}

function parseSheetRecords(rows: unknown[][], form: CustomForm): SheetRecord[] {
  if (!rows.length) return []

  const hasHeader = isSheetHeaderRow(rows[0])

  const headers = hasHeader ? rows[0].map(cell => cellToString(cell)) : buildHeaders(form.fields)

  const dataRows = hasHeader ? rows.slice(1) : rows

  const columnMap = buildFieldColumnMap(headers, form.fields)

  return dataRows
    .map((row, index) => ({ row, rowNumber: hasHeader ? index + 2 : index + 1 }))
    .filter(({ row }) => cellToString(row[0]).trim())
    .map(({ row, rowNumber }) => ({
      id: cellToString(row[0]),
      createdAt: cellToString(row[1]),
      rowNumber,
      values: mapRowToValues(row, form.fields, columnMap)
    }))
}

export function getSheetHeaderRowFromStore(
  spreadsheetId: string,
  sheetName: string,
  form?: CustomForm
): string[] {
  const cached = getSheetAllRows(spreadsheetId, sheetName)

  if (cached?.[0]?.some(cell => String(cell ?? '').trim())) {
    return cached[0]
  }

  return form ? buildHeaders(form.fields) : []
}

export async function appendRecord(
  spreadsheetId: string,
  form: CustomForm,
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>
): Promise<void> {
  const headers = getSheetHeaderRowFromStore(spreadsheetId, form.sheetName, form)

  const row = buildRecordRow(headers, form.fields, recordId, createdAt, values)

  appendSheetDataRow(spreadsheetId, form.sheetName, row)
  notifySpreadsheetDataChanged(spreadsheetId)

  const { enqueueSheetWrite } = await import('./sheetSync')

  enqueueSheetWrite(spreadsheetId, {
    type: 'append',
    sheetName: form.sheetName,
    row
  })
}

export async function fetchRecords(
  spreadsheetId: string,
  form: CustomForm
): Promise<SheetRecord[]> {
  const cached = getSheetAllRows(spreadsheetId, form.sheetName)

  if (cached) {
    return parseSheetRecords(cached, form)
  }

  const rows = await fetchSheetRangeFromApi(spreadsheetId, form.sheetName)

  setSheetAllRows(spreadsheetId, form.sheetName, rows)

  return parseSheetRecords(rows, form)
}

export async function updateRecord(
  spreadsheetId: string,
  form: CustomForm,
  rowNumber: number,
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>
): Promise<void> {
  await updateSheetRow(spreadsheetId, form.sheetName, rowNumber, () => {
    const headers = getSheetHeaderRowFromStore(spreadsheetId, form.sheetName, form)

    return buildRecordRow(headers, form.fields, recordId, createdAt, values)
  })
}

export async function deleteRecord(
  spreadsheetId: string,
  form: CustomForm,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, form.sheetName, rowNumber)
}
