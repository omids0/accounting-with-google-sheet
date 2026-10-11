import type { CustomForm } from '../types'
import { archiveTabsOfForm } from './archiveRegistry'
import { getSettings } from './settings'
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
  /** The tab holding the row: the form tab, or one of its yearly archives. */
  sheetName: string
  values: Record<string, string>
}

function parseSheetRecords(rows: unknown[][], form: CustomForm, sheetName: string): SheetRecord[] {
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
      sheetName,
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

async function loadBaseRows(spreadsheetId: string, form: CustomForm): Promise<string[][]> {
  const cached = getSheetAllRows(spreadsheetId, form.sheetName)

  if (cached) return cached

  const rows = await fetchSheetRangeFromApi(spreadsheetId, form.sheetName)

  setSheetAllRows(spreadsheetId, form.sheetName, rows)

  return rows
}

/** The app's yearly archive tabs of `form` (marked tabs only), oldest first. */
function archiveTabsOf(spreadsheetId: string, form: CustomForm): string[] {
  return archiveTabsOfForm(spreadsheetId, form, getSettings()?.forms ?? [form])
}

/**
 * Every record of the form: its tab plus its yearly archives. A record present
 * in both (a move interrupted halfway) is listed once, from the form tab.
 */
export async function fetchRecords(
  spreadsheetId: string,
  form: CustomForm
): Promise<SheetRecord[]> {
  const records = parseSheetRecords(await loadBaseRows(spreadsheetId, form), form, form.sheetName)

  const seen = new Set(records.map(record => record.id))

  for (const tab of archiveTabsOf(spreadsheetId, form)) {
    for (const record of parseSheetRecords(getSheetAllRows(spreadsheetId, tab) ?? [], form, tab)) {
      if (seen.has(record.id)) continue
      seen.add(record.id)
      records.push(record)
    }
  }

  return records
}

export async function updateRecord(
  spreadsheetId: string,
  form: CustomForm,
  rowNumber: number,
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>,
  sheetName: string = form.sheetName
): Promise<void> {
  await updateSheetRow(spreadsheetId, sheetName, rowNumber, () => {
    const headers = getSheetHeaderRowFromStore(spreadsheetId, sheetName, form)

    return buildRecordRow(headers, form.fields, recordId, createdAt, values)
  })
}

/** Other rows holding `id` in the form tab and its archives (a move interrupted halfway). */
function otherCopies(
  spreadsheetId: string,
  form: CustomForm,
  id: string,
  except: { sheetName: string; rowNumber: number }
): { sheetName: string; rowNumber: number }[] {
  return [form.sheetName, ...archiveTabsOf(spreadsheetId, form)].flatMap(tab =>
    (getSheetAllRows(spreadsheetId, tab) ?? []).flatMap((row, index) => {
      const rowNumber = index + 1

      const same = tab === except.sheetName && rowNumber === except.rowNumber

      return index > 0 && !same && cellToString(row[0]).trim() === id
        ? [{ sheetName: tab, rowNumber }]
        : []
    })
  )
}

/** Deletes the record and every other copy of it, so an archived copy cannot come back. */
export async function deleteRecord(
  spreadsheetId: string,
  form: CustomForm,
  rowNumber: number,
  sheetName: string = form.sheetName
): Promise<void> {
  const id = cellToString(getSheetAllRows(spreadsheetId, sheetName)?.[rowNumber - 1]?.[0]).trim()

  const copies = id ? otherCopies(spreadsheetId, form, id, { sheetName, rowNumber }) : []

  // Bottom rows first, so a second copy in the same tab keeps its row number.
  const targets = [{ sheetName, rowNumber }, ...copies].sort((a, b) => b.rowNumber - a.rowNumber)

  for (const target of targets)
    await deleteSheetRow(spreadsheetId, target.sheetName, target.rowNumber)
}
