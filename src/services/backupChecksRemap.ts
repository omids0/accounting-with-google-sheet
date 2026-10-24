import {
  CHECK_DIRECTION_COLUMN,
  CHECK_DIRECTION_LABELS,
  headerDirectionColumn,
  parseCheckDirection
} from './checkDirection'
import { ensureCheckDirectionColumn } from './migrateCheckDirectionColumn'
import { CHECKS_SHEET } from './sheetNames'
import { normalizeSheetTitle } from './sheetsMeta'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { getSheetAllRows } from './spreadsheetStore'
import { withAttachmentCell } from '../utils/attachmentIds'

export const isChecksTab = (name: string) =>
  normalizeSheetTitle(name) === normalizeSheetTitle(CHECKS_SHEET)

/**
 * Backup rows laid out for the target tab. The app's own columns keep their places; the backup's
 * «نوع چک» cell (found by its label, none = payable) moves into the TARGET's type column, and
 * nothing else lands in that column or keeps the backup's own type column's place.
 * `targetColumn` is -1 while the target has no such column and no restored check is received.
 */
export function remapCheckRows(
  rows: string[][],
  backupHeader: readonly string[],
  targetColumn: number
): string[][] {
  const from = headerDirectionColumn(backupHeader)

  return rows.map(row => {
    const out = row.map((cell, index) =>
      index >= CHECK_DIRECTION_COLUMN && (index === from || index === targetColumn) ? '' : cell
    )

    if (targetColumn < 0) return out

    const type = parseCheckDirection(from >= 0 ? row[from] : undefined)

    return withAttachmentCell(out, targetColumn, CHECK_DIRECTION_LABELS[type])
  })
}

async function targetHeader(spreadsheetId: string): Promise<string[]> {
  const mirrored = getSheetAllRows(spreadsheetId, CHECKS_SHEET) ?? []
  const all = mirrored.length ? mirrored : await fetchSheetRangeFromApi(spreadsheetId, CHECKS_SHEET)

  return (all[0] ?? []).map(cell => String(cell ?? ''))
}

/**
 * The rows to write into the checks tab and the width of the tab as it really is: the type column
 * is created first when any restored check is received, and the rows are padded (and the old ones
 * cleared) to that real width.
 */
export async function prepareChecksRestore(
  spreadsheetId: string,
  plan: { header: string[]; rows: string[][] }
): Promise<{ rows: string[][]; width: number }> {
  const from = headerDirectionColumn(plan.header)

  const anyReceived =
    from >= 0 && plan.rows.some(row => parseCheckDirection(row[from]) === 'received')

  let header: string[]
  let column: number

  if (anyReceived) {
    column = await ensureCheckDirectionColumn(spreadsheetId)

    if (column < 0) throw new Error('ستون «نوع چک» در برگهٔ چک‌ها ساخته نشد؛ دوباره امتحان کنید.')
    header = await targetHeader(spreadsheetId)
  } else {
    header = await targetHeader(spreadsheetId)
    column = headerDirectionColumn(header)
  }

  const rows = remapCheckRows(plan.rows, plan.header, column)

  return { rows, width: Math.max(header.length, column + 1, 1) }
}
