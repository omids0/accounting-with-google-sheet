import { normalizeCellForCompare, rowsMatchForCompare } from './sheetsCellValues'
import { fetchSheetRangeFromApi } from './sheetsRows'

const ID_HEADER = 'شناسه'

/** Thrown when the row an edit or delete was meant for is no longer in the sheet. */
export class RowConflictError extends Error {
  constructor(sheetName: string) {
    super(`ردیف موردنظر در «${sheetName}» پیدا نشد؛ احتمالاً روی دستگاه دیگری تغییر کرده است.`)
    this.name = 'RowConflictError'
  }
}

/**
 * One outbox flush reads each touched sheet at most once and keeps that copy
 * in step with the writes it sends, so a queue of N edits costs one read.
 * Index 0 is the header row (sheet row 1).
 */
export interface RowGuardSession {
  snapshots: Map<string, string[][]>
}

export function createRowGuardSession(): RowGuardSession {
  return { snapshots: new Map() }
}

async function loadSnapshot(
  session: RowGuardSession,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const cached = session.snapshots.get(sheetName)

  if (cached) return cached

  const rows = await fetchSheetRangeFromApi(spreadsheetId, sheetName)

  session.snapshots.set(sheetName, rows)

  return rows
}

function hasIdColumn(rows: string[][]): boolean {
  return normalizeCellForCompare(rows[0]?.[0]) === normalizeCellForCompare(ID_HEADER)
}

function findRowIndexById(rows: string[][], id: string): number {
  const key = normalizeCellForCompare(id)

  if (!key) return -1

  const matches: number[] = []

  for (let index = 1; index < rows.length; index += 1) {
    if (normalizeCellForCompare(rows[index]?.[0]) === key) matches.push(index)
  }

  return matches.length === 1 ? matches[0] : -1
}

function findRowIndexByContent(rows: string[][], expected: string[], hint: number): number {
  let best = -1

  for (let index = 1; index < rows.length; index += 1) {
    if (!rowsMatchForCompare(rows[index] ?? [], expected)) continue
    // Identical duplicates are interchangeable; prefer the one nearest the old position.
    if (best === -1 || Math.abs(index - hint) < Math.abs(best - hint)) best = index
  }

  return best
}

/**
 * Returns the sheet row number that currently holds `expectedRow`.
 * Without `expectedRow` (operations queued by an older app version) the stored
 * row number is used unchanged, which is the previous behaviour.
 */
export async function resolveTargetRow(
  session: RowGuardSession,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  expectedRow?: string[]
): Promise<number> {
  if (!expectedRow) return rowNumber

  const rows = await loadSnapshot(session, spreadsheetId, sheetName)

  const hintIndex = rowNumber - 1

  if (hintIndex >= 1 && rows[hintIndex] && rowsMatchForCompare(rows[hintIndex], expectedRow)) {
    return rowNumber
  }

  if (hasIdColumn(rows) && expectedRow[0]?.trim()) {
    const byId = findRowIndexById(rows, expectedRow[0])

    if (byId !== -1) return byId + 1
  } else {
    const byContent = findRowIndexByContent(rows, expectedRow, hintIndex)

    if (byContent !== -1) return byContent + 1
  }

  throw new RowConflictError(sheetName)
}

/** After a retried append: true when a row with the same ID already landed. */
export async function appendAlreadyApplied(
  session: RowGuardSession,
  spreadsheetId: string,
  sheetName: string,
  row: string[]
): Promise<boolean> {
  const rows = await loadSnapshot(session, spreadsheetId, sheetName)

  if (!hasIdColumn(rows) || !row[0]?.trim()) return false

  return findRowIndexById(rows, row[0]) !== -1
}

export function trackAppend(session: RowGuardSession, sheetName: string, row: string[]): void {
  session.snapshots.get(sheetName)?.push([...row])
}

export function trackUpdate(
  session: RowGuardSession,
  sheetName: string,
  rowNumber: number,
  row: string[]
): void {
  const rows = session.snapshots.get(sheetName)

  if (rows && rows[rowNumber - 1]) rows[rowNumber - 1] = [...row]
}

export function trackDelete(session: RowGuardSession, sheetName: string, rowNumber: number): void {
  session.snapshots.get(sheetName)?.splice(rowNumber - 1, 1)
}

export function trackReplace(session: RowGuardSession, sheetName: string, rows: string[][]): void {
  const current = session.snapshots.get(sheetName)

  if (!current) return

  session.snapshots.set(sheetName, [current[0] ?? [], ...rows.map(row => [...row])])
}
