import { DANG_PAYMENTS_COLUMN } from './dangRow'
import { withGridGrowth } from './sheetGrid'
import { DANG_HEADERS, PAYMENTS_HEADER } from './sheetHeaders'
import { DANG_SHEET } from './sheetNames'
import { writeSheetHeaders } from './sheetsEnsure'
import { normalizeHeaderLabel } from './sheetsHeaders'
import { fetchSheetRangeFromApi } from './sheetsRows'
import { getSheetAllRows, setSheetAllRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'

const MIGRATION_STORAGE_KEY = 'accounting_dang_payments_column_migration_v1'

type MigrationState = Record<string, true>

const inFlight = new Map<string, Promise<void>>()

/** A failed attempt is not repeated on every call: one try per spreadsheet per session. */
const failedThisSession = new Set<string>()

const blank = (cell: unknown) => !String(cell ?? '').trim()

const hasLabel = (header: readonly unknown[] | undefined) =>
  normalizeHeaderLabel(String(header?.[DANG_PAYMENTS_COLUMN] ?? '')) === PAYMENTS_HEADER

/** A payments cell written before its header was (offline): empty or a JSON array. */
const isOwnCell = (cell: unknown) => blank(cell) || String(cell).trim().startsWith('[')

function markMigrated(spreadsheetId: string): void {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  setItem(MIGRATION_STORAGE_KEY, { ...state, [spreadsheetId]: true })
}

async function addPaymentsLabel(spreadsheetId: string): Promise<void> {
  const cached = getSheetAllRows(spreadsheetId, DANG_SHEET) ?? []

  // The mirror already knows the label: nothing to read or write.
  if (hasLabel(cached[0])) return markMigrated(spreadsheetId)

  const allRows = cached.length ? cached : await fetchSheetRangeFromApi(spreadsheetId, DANG_SHEET)
  const header = (allRows[0] ?? []).map(cell => String(cell ?? ''))

  // No header yet: the tab is created with the current one.
  if (!header.some(cell => cell.trim())) return
  if (hasLabel(header)) return markMigrated(spreadsheetId)

  // The user's own column sits there: never take it over, keep the tab as it is.
  if (
    !blank(header[DANG_PAYMENTS_COLUMN]) ||
    !allRows.slice(1).every(row => isOwnCell(row[DANG_PAYMENTS_COLUMN]))
  ) {
    failedThisSession.add(spreadsheetId)

    return
  }

  // ONE write of the whole own header: the app's labels fill any gap before the new column
  // (older tabs lack «ثبت‌کننده»), so the label can never land on the writer's index.
  const next = Array.from({ length: DANG_PAYMENTS_COLUMN + 1 }, (_, index) => {
    if (index === DANG_PAYMENTS_COLUMN) return PAYMENTS_HEADER

    return blank(header[index]) ? DANG_HEADERS[index] : header[index]
  })

  await withGridGrowth(spreadsheetId, DANG_SHEET, 1, next.length, () =>
    writeSheetHeaders(spreadsheetId, DANG_SHEET, next)
  )

  // Only the header row is replaced, on the mirror as it is now, not as it was before the write.
  if (cached.length) {
    const fresh = getSheetAllRows(spreadsheetId, DANG_SHEET) ?? allRows

    setSheetAllRows(spreadsheetId, DANG_SHEET, [
      [...next, ...header.slice(next.length)],
      ...fresh.slice(1)
    ])
  }
  markMigrated(spreadsheetId)
}

/**
 * Adds the «پرداخت‌ها» label to the header of a debts tab created before partial payments. Rows
 * are not touched (a row without the cell reads from the legacy paid column). Once per
 * spreadsheet; when the mirror already has the label no request is made.
 */
export function migrateDangPaymentsColumn(spreadsheetId: string): Promise<void> {
  const state = getItem<MigrationState>(MIGRATION_STORAGE_KEY) ?? {}

  if (!spreadsheetId || state[spreadsheetId] || failedThisSession.has(spreadsheetId)) {
    return Promise.resolve()
  }

  const running = inFlight.get(spreadsheetId)

  if (running) return running

  const started = addPaymentsLabel(spreadsheetId).finally(() => inFlight.delete(spreadsheetId))

  inFlight.set(spreadsheetId, started)

  return started
}

/** Forgets the session's failures and running attempts (tests). */
export function resetDangPaymentsMigrationSession(): void {
  failedThisSession.clear()
  inFlight.clear()
}
