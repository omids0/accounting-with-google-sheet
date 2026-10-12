import { planImport, parseImportCsv, type ImportPlan, type ImportRowTransform } from './importPlan'
import { appendSheetRow, ensureSheetWithHeaders, fetchSheetRows } from './sheets'
import { downloadTextFile, rowsToCsv } from '../utils/csv'

export interface ImportResult {
  imported: number
  skipped: number
}

/** The parsed file, checked against the sheet; nothing is written until `apply`. */
export interface ImportPreview extends ImportPlan {
  apply: () => Promise<ImportResult>
}

/** Appending stopped part-way: `imported` rows are in, the `remaining` ones are not. */
export class PartialImportError extends Error {
  constructor(readonly imported: number, readonly remaining: number, readonly failure: unknown) {
    super('ایمپورت نیمه‌کاره ماند')
    this.name = 'PartialImportError'
  }
}

export async function exportSheetCsv(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  filename: string
): Promise<string | null> {
  const rows = await fetchSheetRows(spreadsheetId, sheetName)

  return downloadTextFile(filename, rowsToCsv(headers, rows))
}

async function appendPlannedRows(
  spreadsheetId: string,
  sheetName: string,
  plan: ImportPlan
): Promise<ImportResult> {
  let imported = 0

  for (const row of plan.rows) {
    try {
      await appendSheetRow(spreadsheetId, sheetName, row)
    } catch (err) {
      throw new PartialImportError(imported, plan.rows.length - imported, err)
    }
    imported++
  }

  return { imported, skipped: plan.duplicates + plan.invalid.length }
}

export async function importSheetCsv(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  csvContent: string,
  transformRow: ImportRowTransform
): Promise<ImportPreview> {
  const parsed = parseImportCsv(csvContent, headers)

  await ensureSheetWithHeaders(spreadsheetId, sheetName, headers)

  const existingIds = (await fetchSheetRows(spreadsheetId, sheetName)).map(row =>
    String(row[0] ?? '')
  )

  const plan = planImport({ ...parsed, existingIds, transformRow })

  return { ...plan, apply: () => appendPlannedRows(spreadsheetId, sheetName, plan) }
}

export function newImportId(raw: string): string {
  return raw.trim() || crypto.randomUUID()
}

export function newImportTimestamp(raw: string): string {
  return raw.trim() || new Date().toLocaleString('fa-IR')
}
