import { logActivity } from './activityLog'
import { rowTitle, type RowConflict } from './rowConflict'
import { CHECKS_SHEET, DANG_SHEET, INSTALLMENTS_SHEET, RECEIVABLES_SHEET } from './sheetNames'
import { flushOutbox, invalidateDerivedCaches, refreshPendingCount } from './sheetSyncOutbox'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getSheetAllRows, getSheetRow, updateSheetDataRow } from './spreadsheetStore'
import { getConflictEntries, keepMineForConflict, removeOutboxEntry } from './syncOutbox'

const MODULE_BY_SHEET: Record<string, string> = {
  [CHECKS_SHEET]: 'checks',
  [INSTALLMENTS_SHEET]: 'installments',
  [DANG_SHEET]: 'dang',
  [RECEIVABLES_SHEET]: 'receivables'
}

/** Updates waiting for «کدام بماند؟», oldest first. */
export function listRowConflicts(spreadsheetId: string): RowConflict[] {
  return getConflictEntries(spreadsheetId).flatMap(entry => {
    const { operation, conflict } = entry

    if (operation.type !== 'update' || !conflict) return []

    return [
      {
        entryId: entry.id,
        sheetName: operation.sheetName,
        rowNumber: operation.rowNumber,
        mine: operation.row,
        theirs: conflict.theirs,
        base: operation.expectedRow ?? [],
        theirEmail: conflict.theirEmail,
        theirAt: conflict.theirAt,
        mineAt: new Date(entry.createdAt).toLocaleTimeString('en-GB')
      }
    ]
  })
}

/** The tab's header from the mirror (labels for the diff and the title). */
export function conflictHeaders(spreadsheetId: string, sheetName: string): string[] {
  return (getSheetRow(spreadsheetId, sheetName, 1) ?? []).map(cell => String(cell ?? ''))
}

export function conflictTitle(spreadsheetId: string, conflict: RowConflict): string {
  return rowTitle(conflictHeaders(spreadsheetId, conflict.sheetName), conflict.theirs)
}

/** Puts `row` into the mirror where its id lives now (a pull may have moved it). */
function setMirrorRow(spreadsheetId: string, sheetName: string, row: string[]): void {
  const id = String(row[0] ?? '').trim()
  const index = (getSheetAllRows(spreadsheetId, sheetName) ?? []).findIndex(
    (current, at) => at > 0 && String(current[0] ?? '').trim() === id
  )

  if (index > 0) updateSheetDataRow(spreadsheetId, sheetName, index + 1, row)
  invalidateDerivedCaches(spreadsheetId)
  notifySpreadsheetDataChanged(spreadsheetId)
}

function logChoice(spreadsheetId: string, conflict: RowConflict, summary: string): void {
  logActivity(spreadsheetId, {
    action: 'update',
    module: MODULE_BY_SHEET[conflict.sheetName] ?? 'records',
    itemId: String(conflict.theirs[0] ?? ''),
    summary
  })
}

/** «نسخهٔ <name>»: drop this device's edit and show their row. */
export function keepTheirVersion(spreadsheetId: string, conflict: RowConflict): void {
  const title = conflictTitle(spreadsheetId, conflict)

  removeOutboxEntry(spreadsheetId, conflict.entryId)
  setMirrorRow(spreadsheetId, conflict.sheetName, conflict.theirs)
  refreshPendingCount(spreadsheetId)
  logChoice(spreadsheetId, conflict, `نسخهٔ خود از «${title}» را کنار گذاشت`)
}

/** «نسخهٔ من»: send this device's edit over their row. */
export function keepMyVersion(
  spreadsheetId: string,
  conflict: RowConflict,
  theirName: string
): void {
  const title = conflictTitle(spreadsheetId, conflict)

  keepMineForConflict(spreadsheetId, conflict.entryId)
  setMirrorRow(spreadsheetId, conflict.sheetName, conflict.mine)
  refreshPendingCount(spreadsheetId)
  logChoice(spreadsheetId, conflict, `نسخهٔ ${theirName} از «${title}» را کنار گذاشت`)
  void flushOutbox(spreadsheetId)
}
