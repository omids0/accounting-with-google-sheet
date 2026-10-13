import type { CustomForm } from '../types'
import type { TabInfo } from './archiveTabs'
import { planYearSweep, type YearSweepOptions } from './recordArchive'
import { withGridGrowth } from './sheetGrid'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { normalizeCellForCompare, rowsMatchForCompare, toSheetRowValues } from './sheetsCellValues'
import { quoteSheetName } from './sheetsMeta'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { cellToString } from '../utils/sheetValues'

/** Rows per values append in the rare put-back path. */
const APPEND_CHUNK = 1000

export function idOf(row: unknown[]): string {
  return cellToString(row[0]).trim()
}

function idSet(rows: unknown[][]): Set<string> {
  return new Set(rows.slice(1).map(idOf).filter(Boolean))
}

/** Whole-row content key, so identical rows count as equal (trailing blanks ignored). */
function rowKey(row: unknown[]): string {
  const cells = row.map(normalizeCellForCompare)

  while (cells.length && !cells[cells.length - 1]) cells.pop()

  return cells.join('\u0001')
}

/** Sorted runs of consecutive indexes. */
function runs(indexes: number[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []

  for (const index of [...indexes].sort((a, b) => a - b)) {
    const last = out[out.length - 1]

    if (last && last.end === index) last.end += 1
    else out.push({ start: index, end: index + 1 })
  }

  return out
}

async function batchUpdate(spreadsheetId: string, requests: unknown[]): Promise<void> {
  if (!requests.length) return

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests })
  })
}

async function deleteRows(
  spreadsheetId: string,
  sheetId: number,
  indexes: number[]
): Promise<void> {
  await batchUpdate(
    spreadsheetId,
    runs(indexes)
      .reverse()
      .map(({ start, end }) => ({
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: start, endIndex: end }
        }
      }))
  )
}

/**
 * Copies base rows `indexes` to the end of the archive on Google's side, so
 * values, number formats, dates and formulas arrive exactly as they are. Only
 * rows whose id is not there yet are copied (a re-run adds nothing). New rows
 * that are not the intended ones (the base shifted, or another device copied
 * too) are removed again. Returns the archive as read back, or null when any
 * planned id is missing from it.
 */
export async function copyRowsToArchive(
  spreadsheetId: string,
  base: TabInfo,
  baseRows: string[][],
  archive: TabInfo,
  indexes: number[],
  /** Form-tab rows that stay there (current year, undated), by id. */
  stays: Map<string, string[]>
): Promise<string[][] | null> {
  const before = await fetchSheetRangeFromApi(spreadsheetId, archive.title)

  const present = idSet(before)

  const toCopy = indexes.filter(index => !present.has(idOf(baseRows[index])))

  const start = Math.max(before.length, 1)

  if (toCopy.length) {
    const width = Math.max(base.columnCount, 1)

    const requests: unknown[] = []

    if (archive.rowCount < start + toCopy.length) {
      const length = start + toCopy.length - archive.rowCount

      requests.push({ appendDimension: { sheetId: archive.sheetId, dimension: 'ROWS', length } })
    }
    if (archive.columnCount < width) {
      const length = width - archive.columnCount

      requests.push({ appendDimension: { sheetId: archive.sheetId, dimension: 'COLUMNS', length } })
    }

    let dest = start

    for (const { start: from, end } of runs(toCopy)) {
      const columns = { startColumnIndex: 0, endColumnIndex: width }

      requests.push({
        copyPaste: {
          source: { sheetId: base.sheetId, startRowIndex: from, endRowIndex: end, ...columns },
          destination: {
            sheetId: archive.sheetId,
            startRowIndex: dest,
            endRowIndex: dest + end - from,
            ...columns
          },
          pasteType: 'PASTE_NORMAL'
        }
      })
      dest += end - from
    }
    await batchUpdate(spreadsheetId, requests)
  }

  let after = await fetchSheetRangeFromApi(spreadsheetId, archive.title)

  const kept = idSet(before.slice(0, start))

  const extras: number[] = []

  // Only two kinds of new rows are removed: a second copy of an id, and a row
  // that still lives unchanged in the form tab (pasted from a shifted range).
  // Anything else may be another device's valid copy and stays.
  for (let index = start; index < after.length; index += 1) {
    const id = idOf(after[index])

    if (!id) continue

    const stay = stays.get(id)

    if (kept.has(id) || (stay && rowsMatchForCompare(after[index], stay))) extras.push(index)
    else kept.add(id)
  }

  if (extras.length) {
    await deleteRows(spreadsheetId, archive.sheetId, extras)
    after = await fetchSheetRangeFromApi(spreadsheetId, archive.title)
  }

  const archived = idSet(after)

  return indexes.every(index => archived.has(idOf(baseRows[index]))) ? after : null
}

async function appendRows(spreadsheetId: string, sheetName: string, rows: string[][]) {
  const range = encodeURIComponent(quoteSheetName(sheetName))

  const width = Math.max(1, ...rows.map(row => row.length))

  for (let i = 0; i < rows.length; i += APPEND_CHUNK) {
    const values = rows.slice(i, i + APPEND_CHUNK).map(toSheetRowValues)

    await withGridGrowth(spreadsheetId, sheetName, 1, width, () =>
      apiRequest(
        `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { method: 'POST', body: JSON.stringify({ values }) }
      )
    )
  }
}

/**
 * Deletes from the form tab only past-year rows whose content equals their
 * archived copy, from a fresh read. A row edited after it was copied, or a
 * second row sharing an id, stays. Afterwards any other row the delete hit
 * (another device shifted rows meanwhile) is put back. Returns the tab as read.
 */
export async function deleteArchivedRows(
  spreadsheetId: string,
  form: CustomForm,
  base: TabInfo,
  archives: string[][][],
  currentYear: number,
  options: YearSweepOptions = {}
): Promise<string[][]> {
  const fresh = await fetchSheetRangeFromApi(spreadsheetId, base.title)

  const copies = new Map<string, string[]>()

  for (const rows of archives) {
    for (const row of rows.slice(1))
      if (idOf(row) && !copies.has(idOf(row))) copies.set(idOf(row), row)
  }

  const used = new Set<string>()

  const indexes = [...(planYearSweep(fresh, form, currentYear, options)?.values() ?? [])]
    .flat()
    .filter(index => {
      const id = idOf(fresh[index])

      const copy = copies.get(id)

      if (!copy || used.has(id) || !rowsMatchForCompare(fresh[index], copy)) return false
      used.add(id)

      return true
    })

  if (!indexes.length) return fresh

  await deleteRows(spreadsheetId, base.sheetId, indexes)

  let after = await fetchSheetRangeFromApi(spreadsheetId, base.title)

  const removed = new Set(indexes)

  const remaining = new Map<string, number>()

  for (const row of after.slice(1))
    remaining.set(rowKey(row), (remaining.get(rowKey(row)) ?? 0) + 1)

  const lost = fresh.slice(1).filter((row, offset) => {
    const key = rowKey(row)

    if (removed.has(offset + 1) || !key) return false

    const count = remaining.get(key) ?? 0

    if (count > 0) {
      remaining.set(key, count - 1)

      return false
    }

    return true
  })

  if (lost.length) {
    await appendRows(spreadsheetId, base.title, lost)
    after = await fetchSheetRangeFromApi(spreadsheetId, base.title)
  }

  return after
}
