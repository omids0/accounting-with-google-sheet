import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows } from './sheets'
import { downloadTextFile, parseCsv, rowsToCsv } from '../utils/csv'

export interface ImportResult {
  imported: number
  skipped: number
}

function hasHeaderRow(firstRow: string[], headers: string[]): boolean {
  if (firstRow.length < headers.length) return false

  return headers.every((header, index) => firstRow[index]?.trim() === header)
}

export async function exportSheetCsv(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  filename: string
): Promise<void> {
  const rows = await fetchSheetRows(spreadsheetId, sheetName)

  const content = rowsToCsv(headers, rows)

  downloadTextFile(filename, content)
}

export async function importSheetCsv(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  csvContent: string,
  transformRow: (cells: string[]) => string[] | null
): Promise<ImportResult> {
  await ensureSheetWithHeaders(spreadsheetId, sheetName, headers)

  const parsed = parseCsv(csvContent)

  if (!parsed.length) {
    throw new Error('فایل خالی است')
  }

  const dataRows = hasHeaderRow(parsed[0], headers) ? parsed.slice(1) : parsed

  let imported = 0

  let skipped = 0

  for (const cells of dataRows) {
    if (!cells.some(cell => cell.trim())) {
      skipped++
      continue
    }

    const row = transformRow(cells)

    if (!row) {
      skipped++
      continue
    }

    await appendSheetRow(spreadsheetId, sheetName, row)
    imported++
  }

  return { imported, skipped }
}

export function newImportId(raw: string): string {
  return raw.trim() || crypto.randomUUID()
}

export function newImportTimestamp(raw: string): string {
  return raw.trim() || new Date().toLocaleString('fa-IR')
}
