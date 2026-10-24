import { isAuthError } from './auth'
import {
  CHECK_DIRECTION_COLUMN,
  CHECK_DIRECTION_HEADER,
  headerDirectionColumn
} from './checkDirection'
import { withGridGrowth } from './sheetGrid'
import { CHECKS_HEADERS } from './sheetHeaders'
import { CHECKS_SHEET } from './sheetNames'
import { writeSheetHeaders } from './sheetsEnsure'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { getSheetAllRows, getSheetRow, setSheetAllRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'
import type { CheckDirection } from '../types'

const MIGRATION_STORAGE_KEY = 'accounting_check_direction_column_migration_v1'

type MigrationState = Record<string, true>

/** The app's own cells end with «ثبت‌کننده»; the user's columns may follow. */
const OWN_COLUMNS = CHECK_DIRECTION_COLUMN

const inFlight = new Map<string, Promise<number>>()

/** A failed attempt is not repeated on every launch: one try per spreadsheet per session. */
const failedThisSession = new Set<string>()

const blank = (cell: unknown) => !String(cell ?? '').trim()

/**
 * The first column from CHECK_DIRECTION_COLUMN on whose header AND cells are all empty: a label
 * of the user's own, or data under a blank header, is never taken over.
 */
export function findFreeDirectionColumn(allRows: readonly (readonly unknown[])[]): number {
  const header = allRows[0] ?? []
  const width = Math.max(header.length, ...allRows.map(row => row.length), OWN_COLUMNS)

  for (let column = OWN_COLUMNS; column < width; column += 1) {
    if (blank(header[column]) && allRows.slice(1).every(row => blank(row[column]))) return column
  }

  return width
}

async function resolveColumn(spreadsheetId: string): Promise<number> {
  const rows = getSheetAllRows(spreadsheetId, CHECKS_SHEET) ?? []
  const allRows = rows.length ? rows : await fetchSheetRangeFromApi(spreadsheetId, CHECKS_SHEET)
  const header = (allRows[0] ?? []).map(cell => String(cell ?? ''))

  // No header yet: the tab is created with the current one.
  if (!header.some(cell => cell.trim())) return -1

  let column = headerDirectionColumn(header)

  if (column < 0) {
    column = findFreeDirectionColumn(allRows)

    // The app's own labels first (older tabs lack «پیوست»/«ثبت‌کننده»), then the new one.
    const next = Array.from({ length: column + 1 }, (_, index) =>
      !blank(header[index]) ? header[index] : index < OWN_COLUMNS ? CHECKS_HEADERS[index] : ''
    )

    next[column] = CHECK_DIRECTION_HEADER
    await withGridGrowth(spreadsheetId, CHECKS_SHEET, 1, next.length, () =>
      writeSheetHeaders(spreadsheetId, CHECKS_SHEET, next)
    )

    // Only the header row is replaced, on the mirror as it is now, not as it was before the write.
    const fresh = getSheetAllRows(spreadsheetId, CHECKS_SHEET) ?? allRows

    // The columns to the right of the new label (the user's own) stay in the mirror's header.
    setSheetAllRows(spreadsheetId, CHECKS_SHEET, [
      [...next, ...header.slice(next.length)],
      ...fresh.slice(1)
    ])
  }

  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })

  return column
}

/**
 * The column that holds «نوع چک», added to the header when the tab has none yet (rows are not
 * touched: a row without the cell is a payable). -1 while the tab has no header at all.
 */
export function ensureCheckDirectionColumn(spreadsheetId: string): Promise<number> {
  const running = inFlight.get(spreadsheetId)

  if (running) return running

  const started = resolveColumn(spreadsheetId).finally(() => inFlight.delete(spreadsheetId))

  inFlight.set(spreadsheetId, started)

  return started
}

/** The background run: once per spreadsheet, and not again this session after a failure. */
export async function migrateCheckDirectionColumn(spreadsheetId: string): Promise<void> {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  if (!spreadsheetId || state[spreadsheetId] || failedThisSession.has(spreadsheetId)) return

  try {
    await ensureCheckDirectionColumn(spreadsheetId)
  } catch {
    failedThisSession.add(spreadsheetId)
  }
}

/**
 * The column a save writes the type into. A payable needs none (no cell reads as payable), so
 * it never waits for the sheet; a received check needs the column and fails the save when it
 * cannot be had, rather than being written as something else.
 */
export async function checkDirectionColumnForWrite(
  spreadsheetId: string,
  direction: CheckDirection
): Promise<number> {
  const known = headerDirectionColumn(getSheetRow(spreadsheetId, CHECKS_SHEET, 1))

  if (known >= 0 || direction === 'paid') return known

  let column: number

  try {
    column = await ensureCheckDirectionColumn(spreadsheetId)
  } catch (err) {
    if (isAuthError(err)) throw err
    // The header has to be written to the sheet at once, so this one save needs the network.
    throw new Error('برای اولین چک دریافتی اینترنت لازم است؛ بعد از اتصال دوباره امتحان کنید.')
  }

  if (column < 0) throw new Error('ستون «نوع چک» در برگهٔ چک‌ها ساخته نشد؛ دوباره امتحان کنید.')

  return column
}

/**
 * The column that would hold the type, without writing anything: the labelled one, else the one
 * the next `ensureCheckDirectionColumn` would add. -1 while the tab has no header or is not loaded.
 */
export function predictCheckDirectionColumn(spreadsheetId: string): number {
  const rows = getSheetAllRows(spreadsheetId, CHECKS_SHEET) ?? []
  const known = headerDirectionColumn(rows[0])

  if (known >= 0) return known

  return (rows[0] ?? []).some(cell => !blank(cell)) ? findFreeDirectionColumn(rows) : -1
}

/** Forgets the session's failures and running attempts (tests). */
export function resetCheckDirectionMigrationSession(): void {
  failedThisSession.clear()
  inFlight.clear()
}
