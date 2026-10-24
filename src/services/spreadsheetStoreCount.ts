import { getStore } from './spreadsheetStore'

/** A row with at least one non-blank cell. */
export function rowHasContent(row: readonly unknown[]): boolean {
  return row.some(cell => String(cell ?? '').trim())
}

/**
 * How many data rows (the header is skipped) of a cached tab satisfy `matches`, or null while the
 * tab is not cached. Reads the store's rows in place instead of copying the tab like
 * `getSheetDataRows` does, and stops once `stopAt` rows matched, so «is there any row?» costs one
 * row, not the whole tab. Read-only: `matches` must not change or keep the row it is given.
 * With `stopAt` 0 it only tells whether the tab is cached (0) or not (null).
 */
export function countSheetDataRows(
  spreadsheetId: string,
  sheetName: string,
  matches: (row: readonly string[]) => boolean,
  stopAt = Infinity
): number | null {
  const rows = getStore(spreadsheetId)?.sheets[sheetName]

  if (!rows) return null

  let count = 0

  for (let index = 1; index < rows.length && count < stopAt; index += 1) {
    if (matches(rows[index])) count += 1
  }

  return count
}
