import { apiRequest, SHEETS_API } from './sheetsApi'
import { parseSheetNameFromRange } from './sheetsMeta'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import {
  appendSheetDataRow,
  deleteSheetDataRow,
  getSheetDataRows,
  replaceSheetDataRows as replaceSheetDataRowsInStore,
  setSheetAllRows,
  updateSheetDataRow
} from './spreadsheetStore'
import type { OutboxWriteOptions } from './syncOutbox'
import { cellToString } from '../utils/sheetValues'

export type SheetWriteOptions = OutboxWriteOptions

export async function fetchSheetRangeFromApi(
  spreadsheetId: string,
  sheetName: string,
  rangeSuffix = 'A1:Z2000'
): Promise<string[][]> {
  const range = encodeURIComponent(`${sheetName}!${rangeSuffix}`)

  const data = await apiRequest<{ values?: unknown[][] }>(
    `${SHEETS_API}/${spreadsheetId}/values/${range}`
  )

  return (data.values ?? []).map(row => row.map(cell => cellToString(cell)))
}

export async function batchFetchSheetRangesFromApi(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[][]>> {
  const result = new Map<string, string[][]>()

  if (!sheetNames.length) return result

  const chunkSize = 20

  for (let i = 0; i < sheetNames.length; i += chunkSize) {
    const chunk = sheetNames.slice(i, i + chunkSize)

    const params = chunk.map(name => `ranges=${encodeURIComponent(`${name}!A1:Z2000`)}`).join('&')

    const data = await apiRequest<{
      valueRanges?: { range?: string; values?: unknown[][] }[]
    }>(`${SHEETS_API}/${spreadsheetId}/values:batchGet?${params}`)

    for (const valueRange of data.valueRanges ?? []) {
      if (!valueRange.range) continue

      const sheetName = parseSheetNameFromRange(valueRange.range)

      const rows = (valueRange.values ?? []).map(row => row.map(cell => cellToString(cell)))

      result.set(sheetName, rows)
    }
  }

  return result
}

export async function fetchSheetRows(
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const cached = getSheetDataRows(spreadsheetId, sheetName)

  if (cached !== null) {
    return cached
  }

  const allRows = await fetchSheetRangeFromApi(spreadsheetId, sheetName)

  setSheetAllRows(spreadsheetId, sheetName, allRows)

  return allRows.length <= 1 ? [] : allRows.slice(1)
}

export async function appendSheetRow(
  spreadsheetId: string,
  sheetName: string,
  row: string[],
  options?: SheetWriteOptions
): Promise<void> {
  appendSheetDataRow(spreadsheetId, sheetName, row)
  if (!options?.skipRevision) {
    notifySpreadsheetDataChanged(spreadsheetId)
  }

  const { enqueueSheetWrite } = await import('./sheetSync')

  enqueueSheetWrite(spreadsheetId, {
    type: 'append',
    sheetName,
    row,
    writeOptions: options
  })
}

export async function updateSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  rowOrBuilder: string[] | (() => string[]),
  options?: SheetWriteOptions
): Promise<void> {
  const row = typeof rowOrBuilder === 'function' ? rowOrBuilder() : rowOrBuilder

  updateSheetDataRow(spreadsheetId, sheetName, rowNumber, row)
  if (!options?.skipRevision) {
    notifySpreadsheetDataChanged(spreadsheetId)
  }

  const { enqueueSheetWrite } = await import('./sheetSync')

  enqueueSheetWrite(spreadsheetId, {
    type: 'update',
    sheetName,
    rowNumber,
    row,
    writeOptions: options
  })
}

export async function deleteSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): Promise<void> {
  deleteSheetDataRow(spreadsheetId, sheetName, rowNumber)
  notifySpreadsheetDataChanged(spreadsheetId)

  const { enqueueSheetWrite } = await import('./sheetSync')

  enqueueSheetWrite(spreadsheetId, {
    type: 'delete',
    sheetName,
    rowNumber
  })
}

export async function replaceSheetDataRows(
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
  columnCount = 2
): Promise<void> {
  replaceSheetDataRowsInStore(spreadsheetId, sheetName, rows)
  notifySpreadsheetDataChanged(spreadsheetId)

  const { enqueueSheetWrite } = await import('./sheetSync')

  enqueueSheetWrite(spreadsheetId, {
    type: 'replace',
    sheetName,
    rows,
    columnCount
  })
}
