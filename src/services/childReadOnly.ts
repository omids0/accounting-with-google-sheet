import { SheetsApiError } from './sheetsApi'
import { getWorkspaceType } from './workspace'

/**
 * Read-only enforcement for a child's account opened on a parent's device (WorkspaceKind
 * `child`, feature «فرزندان من»). The parent has Drive `reader` access only, so any write would
 * be a 403 anyway; these guards make a stray write fail early, locally and with a clear Persian
 * message instead, and keep it out of the outbox.
 *
 * Choke points that call these (so no caller needs its own check):
 * - `apiRequest` (sheetsApi.ts) -> `assertSheetsWriteAllowed`: every Sheets write of the app.
 * - `queueOutboxWrite` (sheetSyncOutbox.ts) -> `assertNotChildReadOnly`: nothing is ever queued.
 * - `flushOutbox`, `repairMissingSheets`, `finalizeSpreadsheetActivation`, the prepare/migration
 *   functions: skip silently for a child (no `ensureAllSheets`, no seeding).
 *
 * Drive calls (`driveShare`: the parent removing its own permission) are NOT blocked.
 */
export const CHILD_READ_ONLY_MESSAGE =
  'این حساب فقط‌خواندنی است؛ در حساب فرزند چیزی ثبت یا تغییر نمی‌کند'

const SHEETS_URL = /^https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\/([^/:?]+)/

const READ_METHODS = ['GET', 'HEAD']

/**
 * 405 «method not allowed»: a sheet error like the others (callers match `SheetsApiError`), and a
 * permanent one (`isPermanentApiError`), so no retry loop ever repeats a write that can never work.
 */
export const CHILD_READ_ONLY_STATUS = 405

/** Throws the read-only error when `spreadsheetId` is a child account. */
export function assertNotChildReadOnly(spreadsheetId: string): void {
  if (isChildReadOnly(spreadsheetId)) {
    throw new SheetsApiError(CHILD_READ_ONLY_MESSAGE, CHILD_READ_ONLY_STATUS)
  }
}

/** True when a write to this sheet must be skipped silently (flushes, repairs, preparation). */
export function isChildReadOnly(spreadsheetId: string): boolean {
  return getWorkspaceType(spreadsheetId) === 'child'
}

/**
 * The backstop in `apiRequest`: a non-read request to a child's spreadsheet is refused before it
 * leaves the device. Reads, Drive calls and requests without a spreadsheet id pass.
 */
export function assertSheetsWriteAllowed(url: string, method = 'GET'): void {
  if (READ_METHODS.includes(method.toUpperCase())) return

  const id = SHEETS_URL.exec(url)?.[1]

  if (id) assertNotChildReadOnly(decodeURIComponent(id))
}
