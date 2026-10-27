import { rowsMatchForCompare } from './sheetsCellValues'
import { normalizeSheetTitle } from './sheetsMeta'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getSheetAllRows, updateSheetDataRow } from './spreadsheetStore'
import { getOutboxEntries } from './syncOutbox'

/**
 * 'fresh': the local copy of the row now equals the sheet's. 'missing': the sheet has no row with
 * this id (deleted on another device). 'skipped': not checked, work from the local copy.
 */
export type FreshRowResult = 'fresh' | 'missing' | 'skipped'

/** A slow connection must not hold a payment hostage: past this the local copy is used. */
const READ_TIMEOUT_MS = 8000

const sameTab = (a: string, b: string): boolean => normalizeSheetTitle(a) === normalizeSheetTitle(b)

const idOf = (row: readonly string[] | undefined): string => String(row?.[0] ?? '').trim()

async function readRow(
  spreadsheetId: string,
  sheetName: string,
  id: string,
  hint: number
): Promise<string[] | null> {
  const at = async (rowNumber: number) =>
    (await fetchSheetRangeFromApi(spreadsheetId, sheetName, `${rowNumber}:${rowNumber}`))[0]

  const hinted = await at(hint)

  if (idOf(hinted) === id) return hinted

  // Rows moved (a delete above): find the id in column A, then read that one row.
  const ids = await fetchSheetRangeFromApi(spreadsheetId, sheetName, 'A:A')

  const found = ids.flatMap((cells, index) => (index > 0 && idOf(cells) === id ? [index + 1] : []))

  if (found.length === 0) return null
  // The same id twice is ambiguous: let the caller keep the local copy.
  if (found.length > 1) throw new Error('duplicate id')

  return (await at(found[0])) ?? null
}

/**
 * Before a payment is computed on a debt or receivable: reads that ONE row from Google Sheets
 * (located by id, row numbers shift) and puts it in the local mirror, so the new payment list is
 * built on what the sheet holds now, not on a copy that may be a poll interval old. Skipped (the
 * local copy stays) when offline, when a write to the tab is still queued (the local copy is then
 * ahead of the sheet and the queue merges it on flush), or when the read fails or is slow.
 */
export async function refreshRowFromSheet(
  spreadsheetId: string,
  sheetName: string,
  id: string
): Promise<FreshRowResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'skipped'

  const queued = getOutboxEntries(spreadsheetId).some(entry =>
    sameTab(entry.operation.sheetName, sheetName)
  )

  if (queued) return 'skipped'

  const rows = getSheetAllRows(spreadsheetId, sheetName) ?? []

  const index = rows.findIndex((row, at) => at > 0 && idOf(row) === id)

  if (index < 1) return 'skipped'

  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const row = await Promise.race([
      readRow(spreadsheetId, sheetName, id, index + 1),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('slow read')), READ_TIMEOUT_MS)
      })
    ])

    if (row === null) return 'missing'
    if (!rowsMatchForCompare(row, rows[index])) {
      updateSheetDataRow(spreadsheetId, sheetName, index + 1, row)
      notifySpreadsheetDataChanged(spreadsheetId)
    }

    return 'fresh'
  } catch {
    return 'skipped'
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Does the sheet hold a row with this id right now? Reads only column A. `null` when that is not
 * known (offline, a write to the tab still queued, a failed or slow read): the caller then decides
 * from its local copy, as for `refreshRowFromSheet`.
 */
export async function sheetHasRowId(
  spreadsheetId: string,
  sheetName: string,
  id: string
): Promise<boolean | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null
  if (
    getOutboxEntries(spreadsheetId).some(entry => sameTab(entry.operation.sheetName, sheetName))
  ) {
    return null
  }

  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const ids = await Promise.race([
      fetchSheetRangeFromApi(spreadsheetId, sheetName, 'A:A'),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('slow read')), READ_TIMEOUT_MS)
      })
    ])

    return ids.some((cells, index) => index > 0 && idOf(cells) === id)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
