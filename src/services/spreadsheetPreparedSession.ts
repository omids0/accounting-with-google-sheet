/**
 * Which spreadsheets this device has already checked for tabs and headers, per spreadsheet and
 * kept in localStorage (sessionStorage is wiped every time the PWA closes, which made every cold
 * start re-check all headers). One record for each spreadsheet, so going back to a building that
 * was opened an hour ago does not run the whole check again; the signature changes whenever an app
 * update adds a sheet or a column, which forces a fresh check.
 */
export const SESSION_PREPARED_KEY = 'accounting_sheets_ready'

/** Re-check headers at least daily even when nothing in the app changed. */
export const PREPARED_MAX_AGE_MS = 24 * 60 * 60_000

/** Oldest records are dropped past this many spreadsheets. */
const MAX_RECORDS = 20

interface PreparedRecord {
  signature: string
  at: number
}

type Records = Record<string, PreparedRecord>

function readRecords(): Records {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_PREPARED_KEY) ?? 'null') as {
      records?: Records
    } | null

    // The first version kept one bare `{ signature, at }`: it has no records, so it checks once.
    return stored?.records ?? {}
  } catch {
    return {}
  }
}

export function isPreparedRecently(
  spreadsheetId: string,
  signature: string,
  now = Date.now()
): boolean {
  const record = readRecords()[spreadsheetId]

  return record?.signature === signature && now - record.at < PREPARED_MAX_AGE_MS
}

export function markPreparedRecently(spreadsheetId: string, signature: string, now = Date.now()) {
  try {
    const records = { ...readRecords(), [spreadsheetId]: { signature, at: now } }

    const newest = Object.entries(records)
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, MAX_RECORDS)

    localStorage.setItem(
      SESSION_PREPARED_KEY,
      JSON.stringify({ records: Object.fromEntries(newest) })
    )
  } catch {
    // Ignore storage failures in private mode.
  }
}

export function clearPreparedRecords(): void {
  try {
    localStorage.removeItem(SESSION_PREPARED_KEY)
    sessionStorage.removeItem(SESSION_PREPARED_KEY)
  } catch {
    // Ignore storage failures in private mode.
  }
}

/**
 * Spreadsheets this app instance has just created with every tab and header in place: their first
 * activation has nothing to check, so it skips straight to opening them.
 */
const freshlyCreated = new Set<string>()

export function markFreshlyCreated(spreadsheetId: string): void {
  freshlyCreated.add(spreadsheetId)
}

export function takeFreshlyCreated(spreadsheetId: string): boolean {
  return freshlyCreated.delete(spreadsheetId)
}
