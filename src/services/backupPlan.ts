import { planImport, type ImportPlan } from './importPlan'
import { ACTIVITY_SHEET, APP_LOCK_SHEET, CATEGORIES_SHEET, REMINDER_LOG_SHEET } from './sheetNames'
import { parseCsv, restoreCsvFormula, rowsToCsv } from '../utils/csv'

export type RestoreMode = 'replace' | 'merge'

/** The app lock stays on the device: its PIN settings never go into a backup file. */
export const BACKUP_EXCLUDED_SHEETS: readonly string[] = [APP_LOCK_SHEET]

/** Tabs whose first column repeats (a category type, a date): a row is known only when every cell matches. */
const WHOLE_ROW_KEY_SHEETS = new Set([CATEGORIES_SHEET, REMINDER_LOG_SHEET])

/** Tabs holding a single record: in a merge, the record already there wins. */
const SINGLE_RECORD_SHEETS = new Set([ACTIVITY_SHEET])

function hasContent(row: string[]): boolean {
  return row.some(cell => String(cell ?? '').trim())
}

function wholeRowKey(row: string[]): string {
  const cells = row.map(cell => String(cell ?? '').trim())

  while (cells.length && !cells[cells.length - 1]) cells.pop()

  return cells.join('\u001f')
}

/**
 * How a merge recognises a row that already exists. Every other tab — and any
 * tab added later — is keyed by its first column («شناسه» or a settings key),
 * the round-4 import rule: a known id is skipped, never overwritten.
 */
export function mergeRowKey(sheetName: string): (row: string[]) => string {
  if (WHOLE_ROW_KEY_SHEETS.has(sheetName)) return wholeRowKey
  if (SINGLE_RECORD_SHEETS.has(sheetName)) return () => '*'

  return row => row[0] ?? ''
}

/** A tab as stored in the backup: its own header row, then every non-empty row. */
export function tabToBackupCsv(
  allRows: string[][],
  fallbackHeaders: string[]
): { csv: string; rows: number } {
  const header = allRows[0] && hasContent(allRows[0]) ? allRows[0] : fallbackHeaders

  const data = allRows.slice(1).filter(hasContent)

  return { csv: rowsToCsv(header, data), rows: data.length }
}

export interface TabRestorePlan extends ImportPlan {
  header: string[]
}

/**
 * Rows to write for one tab. «جایگزین» writes every row of the backup as is;
 * «ادغام» skips rows whose key is already in the tab or earlier in the file.
 */
export function planTabRestore({
  sheetName,
  csv,
  mode,
  existingRows = []
}: {
  sheetName: string
  csv: string
  mode: RestoreMode
  existingRows?: string[][]
}): TabRestorePlan {
  const parsed = parseCsv(csv).map(cells => cells.map(restoreCsvFormula))

  const key = mode === 'merge' ? mergeRowKey(sheetName) : () => ''

  const plan = planImport({
    // Row 1 of a backup CSV is always the tab's header.
    dataRows: parsed.slice(1),
    firstLine: 2,
    existingIds: existingRows.filter(hasContent).map(key),
    transformRow: cells => cells,
    rowKey: key
  })

  return { ...plan, header: parsed[0] ?? [] }
}
