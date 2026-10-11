import type { CustomForm } from '../types'
import { archiveSheetName, planYearSweep } from './recordArchive'
import { withGridGrowth } from './sheetGrid'
import { stampSheetRevisions } from './sheetRevisions'
import { apiRequest, SHEETS_API } from './sheetsApi'
import { toSheetRowValues } from './sheetsCellValues'
import { ensureSheetWithHeaders, getSheetId } from './sheetsEnsure'
import { quoteSheetName } from './sheetsMeta'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import { hasPendingOutbox } from './syncOutbox'
import { getTodayIso, isoToJalali } from '../utils/jalaliDate'
import { cellToString } from '../utils/sheetValues'

/** Rows per append request, to keep each request well under Google's payload limits. */
const APPEND_CHUNK = 1000

function idOf(row: unknown[]): string {
  return cellToString(row[0]).trim()
}

function idSet(rows: unknown[][]): Set<string> {
  return new Set(rows.slice(1).map(idOf).filter(Boolean))
}

async function appendRows(spreadsheetId: string, sheetName: string, rows: string[][]) {
  const range = encodeURIComponent(quoteSheetName(sheetName))

  const width = Math.max(1, ...rows.map(row => row.length))

  for (let i = 0; i < rows.length; i += APPEND_CHUNK) {
    const chunk = rows.slice(i, i + APPEND_CHUNK)

    await withGridGrowth(spreadsheetId, sheetName, 1, width, () =>
      apiRequest(
        `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { method: 'POST', body: JSON.stringify({ values: chunk.map(toSheetRowValues) }) }
      )
    )
  }
}

/** Contiguous 0-based row ranges, last first, so earlier deletes do not shift later ones. */
function descendingRanges(indexes: number[]): { startIndex: number; endIndex: number }[] {
  const sorted = [...indexes].sort((a, b) => a - b)

  const ranges: { startIndex: number; endIndex: number }[] = []

  for (const index of sorted) {
    const last = ranges[ranges.length - 1]

    if (last && last.endIndex === index) last.endIndex += 1
    else ranges.push({ startIndex: index, endIndex: index + 1 })
  }

  return ranges.reverse()
}

/**
 * Copies one year's rows into its archive tab and proves every id landed.
 * Only rows not already there are appended, so a re-run after a crash adds no
 * duplicates. Returns the archive as read back, or null when unconfirmed.
 */
async function copyYear(
  spreadsheetId: string,
  tab: string,
  header: string[],
  rows: string[][]
): Promise<string[][] | null> {
  await ensureSheetWithHeaders(spreadsheetId, tab, header)

  const present = idSet(await fetchSheetRangeFromApi(spreadsheetId, tab))

  const missing = rows.filter(row => !present.has(idOf(row)))

  if (missing.length) await appendRows(spreadsheetId, tab, missing)

  const archived = await fetchSheetRangeFromApi(spreadsheetId, tab)

  const archivedIds = idSet(archived)

  return rows.every(row => archivedIds.has(idOf(row))) ? archived : null
}

/** Deletes `movedIds` from the form tab, then puts back any other row the delete hit. */
async function deleteMoved(
  spreadsheetId: string,
  sheetName: string,
  movedIds: Set<string>
): Promise<string[][]> {
  const before = await fetchSheetRangeFromApi(spreadsheetId, sheetName)

  const indexes = before.flatMap((row, index) =>
    index > 0 && movedIds.has(idOf(row)) ? [index] : []
  )

  if (!indexes.length) return before

  const sheetId = await getSheetId(spreadsheetId, sheetName)

  await apiRequest(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: descendingRanges(indexes).map(range => ({
        deleteDimension: { range: { sheetId, dimension: 'ROWS', ...range } }
      }))
    })
  })

  // Another device may have shifted rows between the read and the delete.
  let after = await fetchSheetRangeFromApi(spreadsheetId, sheetName)

  const kept = idSet(after)

  const lost = before.slice(1).filter(row => {
    const id = idOf(row)

    return id && !movedIds.has(id) && !kept.has(id)
  })

  if (lost.length) {
    await appendRows(spreadsheetId, sheetName, lost)
    after = await fetchSheetRangeFromApi(spreadsheetId, sheetName)
  }

  return after
}

/**
 * Moves past-year rows of a form tab over the threshold into `<tab> <year>`
 * archives: copy, verify by id, and only then delete. Returns true when rows
 * moved. Any unconfirmed copy stops the sweep before anything is deleted.
 */
export async function sweepFormArchives(
  spreadsheetId: string,
  form: CustomForm,
  currentYear = isoToJalali(getTodayIso()).year
): Promise<boolean> {
  const base = await fetchSheetRangeFromApi(spreadsheetId, form.sheetName)

  const plan = planYearSweep(base, form, currentYear)

  if (!plan || !base.length) return false

  const header = base[0].map(cell => cellToString(cell))

  const archives = new Map<string, string[][]>()

  const movedIds = new Set<string>()

  for (const [year, rows] of [...plan].sort(([a], [b]) => a - b)) {
    const tab = archiveSheetName(form.sheetName, year)

    const archived = await copyYear(spreadsheetId, tab, header, rows)

    if (!archived) return false

    archives.set(tab, archived)
    for (const row of rows) movedIds.add(idOf(row))
  }

  const remaining = await deleteMoved(spreadsheetId, form.sheetName, movedIds)

  for (const [tab, rows] of archives) setSheetAllRows(spreadsheetId, tab, rows)
  setSheetAllRows(spreadsheetId, form.sheetName, remaining)

  await stampSheetRevisions(spreadsheetId, [form.sheetName, ...archives.keys()]).catch(
    () => undefined
  )
  notifySpreadsheetDataChanged(spreadsheetId)

  return true
}

let sweeping = false

/**
 * Runs after a pull. The threshold check uses the local mirror, so a sheet
 * under it costs no request. Waits while any write is queued.
 */
export async function sweepArchivesAfterPull(
  spreadsheetId: string,
  forms: CustomForm[]
): Promise<void> {
  if (sweeping || !spreadsheetId || hasPendingOutbox(spreadsheetId)) return

  sweeping = true
  try {
    const currentYear = isoToJalali(getTodayIso()).year

    for (const form of forms) {
      const mirror = getSheetAllRows(spreadsheetId, form.sheetName)

      if (!mirror || !planYearSweep(mirror, form, currentYear)) continue
      if (hasPendingOutbox(spreadsheetId)) return

      await sweepFormArchives(spreadsheetId, form, currentYear)
    }
  } finally {
    sweeping = false
  }
}
