import { reapplyFailedWrite } from './failedWriteMirror'
import { RowEditConflictError } from './rowConflict'
import { getSettings, getSpreadsheets } from './settings'
import { RECEIVABLES_HEADERS, WALLET_LEDGER_HEADERS } from './sheetHeaders'
import { RECEIVABLES_SHEET, WALLET_LEDGER_SHEET } from './sheetNames'
import { executeOutboxOperation, isQuotaExceededError } from './sheets'
import { SheetsApiError } from './sheetsApi'
import { ensureManySheetsWithHeaders, type SheetSpec } from './sheetsEnsure'
import { buildHeaders } from './sheetsHeaders'
import { normalizeSheetTitle } from './sheetsMeta'
import { createRowGuardSession, RowConflictError } from './sheetsRowGuard'
import { announceWrites } from './sheetSyncAnnounce'
import {
  flushOutbox,
  isQuotaBlocked,
  markQuotaExceeded,
  queueOutboxWrite,
  withOutboxLock
} from './sheetSyncOutbox'
import {
  addOutboxEntry,
  getOutboxEntries,
  hasPendingOutbox,
  markOutboxEntryConflict,
  markOutboxEntryFailed,
  removeOutboxEntry,
  type OutboxEntry,
  type OutboxOperation
} from './syncOutbox'
import { getWorkspaceType } from './workspace'
import { withoutBuildingFields } from '../components/form/buildingFields'
import { withStandardFields } from '../components/form/fieldUtils'

/**
 * The bridge between workspaces (round 11, Step 8). Only ONE spreadsheet mirror lives in memory, and
 * the normal write path (`appendSheetRow` and friends) loads the spreadsheet it is given into it, so
 * writing to a spreadsheet that is not open that way would wipe the open one. A bridged write goes
 * to the TARGET spreadsheet's own outbox instead (persisted under that spreadsheet's key, so it is
 * also sent by the normal flush the next time that workspace is opened) and is sent at once when
 * online by `drainWorkspace`: the same executor and the same cross-tab outbox lock as the normal
 * flush, but without the global sync indicator and without touching any mirror.
 */

const isActive = (spreadsheetId: string) => getSettings()?.spreadsheetId === spreadsheetId

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine

/**
 * The tab a bridged write may have to create first (only tabs the bridges themselves write to). A
 * shared account's record tab gets the shared columns, never the personal ones of this device.
 */
function tabSpecOf(spreadsheetId: string, sheetName: string): SheetSpec | null {
  if (sheetName === RECEIVABLES_SHEET) return { sheetName, headers: RECEIVABLES_HEADERS }
  if (sheetName === WALLET_LEDGER_SHEET) return { sheetName, headers: WALLET_LEDGER_HEADERS }

  const forms = getSettings()?.forms ?? []
  const form = (
    getWorkspaceType(spreadsheetId) === 'shared'
      ? withStandardFields(forms, false, true)
      : withoutBuildingFields(forms)
  ).find(item => normalizeSheetTitle(item.sheetName) === normalizeSheetTitle(sheetName))

  return form ? { sheetName, headers: buildHeaders(form.fields) } : null
}

async function ensureTabs(spreadsheetId: string, entries: OutboxEntry[]): Promise<void> {
  const specs = new Map<string, SheetSpec>()

  for (const { operation } of entries) {
    const spec = operation.type === 'append' ? tabSpecOf(spreadsheetId, operation.sheetName) : null

    if (spec) specs.set(normalizeSheetTitle(spec.sheetName), spec)
  }
  if (specs.size) await ensureManySheetsWithHeaders(spreadsheetId, [...specs.values()])
}

/** A write that failed this many times waits for its workspace to open: the normal flush parks it there. */
const MAX_CLOSED_ATTEMPTS = 5

/**
 * Sends what a closed workspace has queued, in order: a write that fails holds back the later writes
 * of the same tab only. Nothing is ever dropped here. A write the sheet refuses stays queued too
 * (reported in the sheet switcher): undoing it needs that workspace's mirror, so the normal flush
 * decides when it is opened.
 */
async function drainClosedWorkspace(spreadsheetId: string): Promise<boolean> {
  if (isOffline() || isQuotaBlocked()) return false

  return withOutboxLock(spreadsheetId, async () => {
    const entries = getOutboxEntries(spreadsheetId).filter(
      entry => !entry.conflict && entry.attempts < MAX_CLOSED_ATTEMPTS
    )

    if (!entries.length) return !hasPendingOutbox(spreadsheetId)

    const session = createRowGuardSession()

    const touched = new Set<string>()

    const heldBack = new Set<string>()

    try {
      await ensureTabs(spreadsheetId, entries)
      for (const entry of entries) {
        const tab = normalizeSheetTitle(entry.operation.sheetName)

        if (heldBack.has(tab)) continue

        try {
          const written = await executeOutboxOperation(spreadsheetId, entry.operation, {
            session,
            isRetry: entry.attempts > 0
          })

          removeOutboxEntry(spreadsheetId, entry.id)
          touched.add(written || entry.operation.sheetName)
        } catch (err) {
          if (err instanceof RowEditConflictError) {
            const { theirs, theirEmail, theirAt } = err

            markOutboxEntryConflict(spreadsheetId, entry.id, { theirs, theirEmail, theirAt })
            continue
          }

          markOutboxEntryFailed(
            spreadsheetId,
            entry.id,
            err instanceof Error ? err.message : 'خطا در همگام‌سازی'
          )
          if (isQuotaExceededError(err)) {
            markQuotaExceeded()

            return false
          }
          // No HTTP answer at all (dropped connection): every tab would fail the same way.
          if (!(err instanceof SheetsApiError) && !(err instanceof RowConflictError)) return false
          heldBack.add(tab)
        }
      }
    } catch {
      // The tab could not be prepared (offline, no access): everything stays queued.
      return false
    } finally {
      await announceWrites(spreadsheetId, touched, null)
    }

    return !hasPendingOutbox(spreadsheetId)
  })
}

/**
 * Sends the writes queued for a workspace: the open one through its normal flush, any other one
 * through the bridge flush above. Resolves true when nothing is left to send.
 */
export function drainWorkspace(spreadsheetId: string): Promise<boolean> {
  return isActive(spreadsheetId) ? flushOutbox(spreadsheetId) : drainClosedWorkspace(spreadsheetId)
}

/**
 * Writes one operation into another workspace without switching to it. The write is persisted in
 * that workspace's outbox first, so a failure later (offline, no access) never loses it and never
 * undoes the write that caused it: it stays queued (counted in the sheet switcher) and goes out
 * when the device is online again or when that workspace is next opened. Resolves true when it
 * reached the sheet right away.
 */
export async function writeToWorkspace(
  spreadsheetId: string,
  operation: OutboxOperation | OutboxOperation[]
): Promise<boolean> {
  const operations = Array.isArray(operation) ? operation : [operation]

  if (isActive(spreadsheetId)) {
    // The open workspace shows its own rows: apply the write to them as the normal path does.
    for (const item of operations) {
      reapplyFailedWrite(spreadsheetId, item)
      queueOutboxWrite(spreadsheetId, item)
    }

    return false
  }

  for (const item of operations) addOutboxEntry(spreadsheetId, item)

  return drainClosedWorkspace(spreadsheetId).catch(() => false)
}

/** Sends the leftovers of every workspace that is not open (app start, back online, back in focus). */
export async function drainBridgeWorkspaces(): Promise<void> {
  for (const entry of getSpreadsheets()) {
    if (!isActive(entry.id) && hasPendingOutbox(entry.id)) {
      await drainClosedWorkspace(entry.id).catch(() => false)
    }
  }
}
