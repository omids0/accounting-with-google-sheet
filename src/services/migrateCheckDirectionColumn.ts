import { CHECK_DIRECTION_COLUMN, CHECK_DIRECTION_HEADER } from './checkDirection'
import { withGridGrowth } from './sheetGrid'
import { CHECKS_HEADERS } from './sheetHeaders'
import { CHECKS_SHEET } from './sheetNames'
import { writeSheetHeaders } from './sheetsEnsure'
import { normalizeHeaderLabel } from './sheetsHeaders'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'

const MIGRATION_STORAGE_KEY = 'accounting_check_direction_column_migration_v1'

type MigrationState = Record<string, true>

/**
 * Adds the «نوع چک» header to the checks tab of a spreadsheet made before it. Only the header
 * row is written: the column sits at a fixed index after «پیوست» and «ثبت‌کننده» (filled in
 * here when an older tab lacks them), and a row without the cell is read as «پرداختی».
 */
export async function migrateCheckDirectionColumn(spreadsheetId: string): Promise<void> {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  if (!spreadsheetId || state[spreadsheetId]) return

  const rows = getSheetAllRows(spreadsheetId, CHECKS_SHEET) ?? []
  const allRows = rows.length ? rows : await fetchSheetRangeFromApi(spreadsheetId, CHECKS_SHEET)
  const header = (allRows[0] ?? []).map(cell => String(cell ?? ''))

  // No header yet: the sheet is created with the current one.
  if (!header.some(cell => cell.trim())) return

  // Another label at the index keeps its data by position; nothing is written over it.
  const taken = Boolean(String(header[CHECK_DIRECTION_COLUMN] ?? '').trim())
  const present = header.some(cell => normalizeHeaderLabel(cell) === CHECK_DIRECTION_HEADER)

  if (!taken && !present) {
    const next = [...header]

    for (let index = 0; index <= CHECK_DIRECTION_COLUMN; index += 1) {
      if (!String(next[index] ?? '').trim()) next[index] = CHECKS_HEADERS[index]
    }
    await withGridGrowth(spreadsheetId, CHECKS_SHEET, 1, next.length, () =>
      writeSheetHeaders(spreadsheetId, CHECKS_SHEET, next)
    )
    setSheetAllRows(spreadsheetId, CHECKS_SHEET, [next, ...allRows.slice(1)])
  }

  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })
}
