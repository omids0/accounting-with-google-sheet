import { forgetSeenSheets } from './sheetRevisions'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import type { OutboxOperation } from './syncOutbox'

function sameRow(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((cell, index) => cell === b[index])
}

/**
 * Index of `target` among the data rows (row 0 is the header): the hinted index
 * when it still holds that row, else the only match. -1 when absent or ambiguous.
 */
function locateRow(rows: string[][], target: string[], hint: number): number {
  if (hint >= 1 && hint < rows.length && sameRow(rows[hint], target)) return hint

  const matches: number[] = []

  rows.forEach((row, index) => {
    if (index >= 1 && sameRow(row, target)) matches.push(index)
  })

  return matches.length === 1 ? matches[0] : -1
}

/**
 * Takes a write that never reached the sheet back out of a tab's rows. Only
 * undone while the mirror still shows exactly what the write put there, so a
 * later local edit of the same row is never thrown away. Null: nothing to undo.
 */
export function revertWriteRows(rows: string[][], operation: OutboxOperation): string[][] | null {
  const next = rows.map(row => [...row])

  if (operation.type === 'append') {
    let index = next.length - 1

    while (index >= 1 && !sameRow(next[index], operation.row)) index -= 1
    if (index < 1) return null
    next.splice(index, 1)

    return next
  }
  if (operation.type === 'update') {
    if (!operation.expectedRow) return null

    const index = locateRow(next, operation.row, operation.rowNumber - 1)

    if (index < 0) return null
    next[index] = [...operation.expectedRow]

    return next
  }
  if (operation.type === 'delete') {
    const { expectedRow } = operation

    if (!expectedRow || next.some((row, i) => i >= 1 && sameRow(row, expectedRow))) return null
    next.splice(Math.max(1, Math.min(operation.rowNumber - 1, next.length)), 0, [...expectedRow])

    return next
  }

  // A whole-tab replace keeps no copy of what it replaced.
  return null
}

/** Applies a write to a tab's rows again, as the app did when it was first made. */
export function applyWriteRows(rows: string[][], operation: OutboxOperation): string[][] | null {
  const next = rows.map(row => [...row])

  if (operation.type === 'append') return [...next, [...operation.row]]
  if (operation.type === 'replace') {
    return [...next.slice(0, 1), ...operation.rows.map(row => [...row])]
  }

  const hint = operation.rowNumber - 1
  const index = operation.expectedRow ? locateRow(next, operation.expectedRow, hint) : hint

  if (index < 1 || index >= next.length) return null
  if (operation.type === 'update') next[index] = [...operation.row]
  else next.splice(index, 1)

  return next
}

function rewriteTab(
  spreadsheetId: string,
  operation: OutboxOperation,
  change: (rows: string[][], operation: OutboxOperation) => string[][] | null
): boolean {
  const rows = getSheetAllRows(spreadsheetId, operation.sheetName)
  const next = rows ? change(rows, operation) : null

  if (!next) return false
  setSheetAllRows(spreadsheetId, operation.sheetName, next)
  notifySpreadsheetDataChanged(spreadsheetId)

  return true
}

/**
 * The sheet never got this write: show the row as the sheet has it. The tab is
 * also marked stale so the next pull replaces the mirror with the sheet's copy.
 */
export function revertFailedWrite(spreadsheetId: string, operation: OutboxOperation): boolean {
  forgetSeenSheets(spreadsheetId, [operation.sheetName])

  return rewriteTab(spreadsheetId, operation, revertWriteRows)
}

export function reapplyFailedWrite(spreadsheetId: string, operation: OutboxOperation): boolean {
  return rewriteTab(spreadsheetId, operation, applyWriteRows)
}
