import { findAttachmentColumn } from './attachmentColumn'
import { apiRequest, SHEETS_API, SheetsApiError } from './sheetsApi'
import { normalizeSheetTitle, parseSheetNameFromRange, quoteSheetName } from './sheetsMeta'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import {
  appendSheetDataRow,
  deleteSheetDataRow,
  getSheetDataRows,
  getSheetRow,
  replaceSheetDataRows as replaceSheetDataRowsInStore,
  setSheetAllRows,
  updateSheetDataRow
} from './spreadsheetStore'
import type { OutboxWriteOptions } from './syncOutbox'
import { keepAttachmentCell } from '../utils/attachmentIds'
import { cellToString } from '../utils/sheetValues'

export type SheetWriteOptions = OutboxWriteOptions

/**
 * Without a suffix the whole sheet is read. No row or column bound: a fixed end
 * row dropped data past it, and `A:Z` is rejected by a trimmed grid narrower
 * than Z (while also missing hand-added columns past it).
 */
export async function fetchSheetRangeFromApi(
  spreadsheetId: string,
  sheetName: string,
  rangeSuffix?: string
): Promise<string[][]> {
  const ref = quoteSheetName(sheetName)

  const range = encodeURIComponent(rangeSuffix ? `${ref}!${rangeSuffix}` : ref)

  const data = await apiRequest<{ values?: unknown[][] }>(
    `${SHEETS_API}/${spreadsheetId}/values/${range}`
  )

  return (data.values ?? []).map(row => row.map(cell => cellToString(cell)))
}

type BatchGetResponse = { valueRanges?: { range?: string; values?: unknown[][] }[] }

function batchGet(spreadsheetId: string, sheetNames: string[]): Promise<BatchGetResponse> {
  const params = sheetNames
    .map(name => `ranges=${encodeURIComponent(quoteSheetName(name))}`)
    .join('&')

  return apiRequest<BatchGetResponse>(`${SHEETS_API}/${spreadsheetId}/values:batchGet?${params}`)
}

/**
 * Google rejects a whole batchGet (400 «Unable to parse range») when one tab is
 * missing, e.g. a tab a newer app version knows but this spreadsheet never got.
 * Retry once with only the tabs that exist, so one missing tab cannot stop every
 * other sheet from syncing.
 */
async function batchGetSkippingMissing(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<BatchGetResponse> {
  try {
    return await batchGet(spreadsheetId, sheetNames)
  } catch (err) {
    if (!(err instanceof SheetsApiError) || err.status !== 400) throw err

    const { getSheetTitles } = await import('./sheetsEnsure')
    const existing = new Set((await getSheetTitles(spreadsheetId, true)).map(normalizeSheetTitle))
    const present = sheetNames.filter(name => existing.has(normalizeSheetTitle(name)))

    if (present.length === sheetNames.length) throw err

    return present.length ? batchGet(spreadsheetId, present) : {}
  }
}

export async function batchFetchSheetRangesFromApi(
  spreadsheetId: string,
  sheetNames: string[]
): Promise<Map<string, string[][]>> {
  const result = new Map<string, string[][]>()

  if (!sheetNames.length) return result

  const chunkSize = 20

  const chunks: string[][] = []

  for (let i = 0; i < sheetNames.length; i += chunkSize) {
    chunks.push(sheetNames.slice(i, i + chunkSize))
  }

  const responses = await Promise.all(
    chunks.map(chunk => batchGetSkippingMissing(spreadsheetId, chunk))
  )

  for (const data of responses) {
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

/**
 * A row number captured before another row of the sheet was deleted (e.g. an
 * edit form left open through an undo window) can point one row off. On sheets
 * keyed by «شناسه», when the row there has another id, follow the id instead.
 */
export function currentRowNumberFor(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  row: string[]
): number {
  const id = row[0]?.trim()

  if (!id || getSheetRow(spreadsheetId, sheetName, 1)?.[0]?.trim() !== 'شناسه') return rowNumber
  if (getSheetRow(spreadsheetId, sheetName, rowNumber)?.[0]?.trim() === id) return rowNumber

  const matches: number[] = []

  getSheetDataRows(spreadsheetId, sheetName)?.forEach((current, index) => {
    if (current[0]?.trim() === id) matches.push(index + 2)
  })

  return matches.length === 1 ? matches[0] : rowNumber
}

/**
 * Rewrites one row. The «پیوست» cell survives a rebuilt row that leaves it
 * empty (entity writers never fill it); `exact` writes the row as given, for
 * the attachment service that sets or clears it on purpose.
 */
export async function updateSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  rowOrBuilder: string[] | (() => string[]),
  options?: SheetWriteOptions,
  exact = false
): Promise<void> {
  const built = typeof rowOrBuilder === 'function' ? rowOrBuilder() : rowOrBuilder

  rowNumber = currentRowNumberFor(spreadsheetId, sheetName, rowNumber, built)

  const expectedRow = getSheetRow(spreadsheetId, sheetName, rowNumber) ?? undefined

  const row = exact
    ? built
    : keepAttachmentCell(built, expectedRow, findAttachmentColumn(spreadsheetId, sheetName))

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
    expectedRow,
    writeOptions: options
  })
}

export async function deleteSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): Promise<void> {
  const expectedRow = getSheetRow(spreadsheetId, sheetName, rowNumber) ?? undefined

  deleteSheetDataRow(spreadsheetId, sheetName, rowNumber)
  notifySpreadsheetDataChanged(spreadsheetId)

  const { enqueueSheetWrite } = await import('./sheetSync')

  enqueueSheetWrite(spreadsheetId, {
    type: 'delete',
    sheetName,
    rowNumber,
    expectedRow
  })
}

export async function replaceSheetDataRows(
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
  columnCount = 2,
  headerRow?: string[]
): Promise<void> {
  replaceSheetDataRowsInStore(spreadsheetId, sheetName, rows, headerRow)
  notifySpreadsheetDataChanged(spreadsheetId)

  const { enqueueSheetWrite } = await import('./sheetSync')

  enqueueSheetWrite(spreadsheetId, {
    type: 'replace',
    sheetName,
    rows,
    columnCount
  })
}
