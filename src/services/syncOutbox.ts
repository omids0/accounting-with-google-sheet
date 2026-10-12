import { normalizeSheetTitle } from './sheetsMeta'
import { getItem, removeItem, setItem } from './storage'

const OUTBOX_KEY_PREFIX = 'accounting_sync_outbox_'

export interface OutboxWriteOptions {
  skipActivity?: boolean
  skipRevision?: boolean
}

export type OutboxOperation =
  | {
      type: 'append'
      sheetName: string
      row: string[]
      writeOptions?: OutboxWriteOptions
    }
  | {
      type: 'update'
      sheetName: string
      rowNumber: number
      row: string[]
      /** The row as the app saw it before the edit; used to re-find it if rows moved. */
      expectedRow?: string[]
      writeOptions?: OutboxWriteOptions
    }
  | {
      type: 'delete'
      sheetName: string
      rowNumber: number
      expectedRow?: string[]
    }
  | {
      type: 'replace'
      sheetName: string
      rows: string[][]
      columnCount: number
    }

export interface OutboxEntry {
  id: string
  spreadsheetId: string
  createdAt: number
  operation: OutboxOperation
  attempts: number
  lastError?: string
  /** Parked write whose change was taken back out of the local mirror. */
  reverted?: boolean
}

function outboxKey(spreadsheetId: string): string {
  return `${OUTBOX_KEY_PREFIX}${spreadsheetId}`
}

function readOutbox(spreadsheetId: string): OutboxEntry[] {
  return getItem<OutboxEntry[]>(outboxKey(spreadsheetId)) ?? []
}

function writeOutbox(spreadsheetId: string, entries: OutboxEntry[]): void {
  if (!entries.length) {
    removeItem(outboxKey(spreadsheetId))

    return
  }
  setItem(outboxKey(spreadsheetId), entries)
}

export function getOutboxEntries(spreadsheetId: string): OutboxEntry[] {
  return readOutbox(spreadsheetId)
}

export function getOutboxCount(spreadsheetId: string): number {
  return readOutbox(spreadsheetId).length
}

export function getOutboxSheetNames(spreadsheetId: string): Set<string> {
  const names = new Set<string>()

  for (const entry of readOutbox(spreadsheetId)) {
    names.add(entry.operation.sheetName)
  }

  return names
}

export function hasPendingOutbox(spreadsheetId: string): boolean {
  return getOutboxCount(spreadsheetId) > 0
}

export function addOutboxEntry(spreadsheetId: string, operation: OutboxOperation): OutboxEntry {
  const entry: OutboxEntry = {
    id: crypto.randomUUID(),
    spreadsheetId,
    createdAt: Date.now(),
    operation,
    attempts: 0
  }

  const next = [...readOutbox(spreadsheetId), entry]

  writeOutbox(spreadsheetId, next)

  return entry
}

export function removeOutboxEntry(spreadsheetId: string, entryId: string): void {
  const next = readOutbox(spreadsheetId).filter(entry => entry.id !== entryId)

  writeOutbox(spreadsheetId, next)
}

export function markOutboxEntryFailed(spreadsheetId: string, entryId: string, error: string): void {
  const next = readOutbox(spreadsheetId).map(entry =>
    entry.id === entryId ? { ...entry, attempts: entry.attempts + 1, lastError: error } : entry
  )

  writeOutbox(spreadsheetId, next)
}

export function clearOutbox(spreadsheetId: string): void {
  removeItem(outboxKey(spreadsheetId))
}

const FAILED_KEY_PREFIX = 'accounting_sync_failed_'

const MAX_FAILED_ENTRIES = 50

function failedKey(spreadsheetId: string): string {
  return `${FAILED_KEY_PREFIX}${spreadsheetId}`
}

/**
 * Writes Google rejected for good (bad range, conflicting row, oversized cell).
 * They are parked here instead of blocking every later write forever.
 */
export function getFailedOutboxEntries(spreadsheetId: string): OutboxEntry[] {
  return getItem<OutboxEntry[]>(failedKey(spreadsheetId)) ?? []
}

function writeFailed(spreadsheetId: string, entries: OutboxEntry[]): void {
  if (entries.length) setItem(failedKey(spreadsheetId), entries.slice(-MAX_FAILED_ENTRIES))
  else clearFailedOutboxEntries(spreadsheetId)
}

export function moveOutboxEntryToFailed(
  spreadsheetId: string,
  entryId: string,
  error: string,
  extra: Pick<OutboxEntry, 'reverted'> = {}
): void {
  const entries = readOutbox(spreadsheetId)
  const entry = entries.find(item => item.id === entryId)

  if (!entry) return

  writeOutbox(
    spreadsheetId,
    entries.filter(item => item.id !== entryId)
  )
  writeFailed(spreadsheetId, [
    ...getFailedOutboxEntries(spreadsheetId),
    { ...entry, ...extra, attempts: entry.attempts + 1, lastError: error }
  ])
}

export function clearFailedOutboxEntries(spreadsheetId: string): void {
  removeItem(failedKey(spreadsheetId))
}

/** Removes one parked write from the failed list and returns it. */
export function takeFailedOutboxEntry(spreadsheetId: string, entryId: string): OutboxEntry | null {
  const failed = getFailedOutboxEntries(spreadsheetId)
  const entry = failed.find(item => item.id === entryId)

  if (!entry) return null
  writeFailed(
    spreadsheetId,
    failed.filter(item => item.id !== entryId)
  )

  return entry
}

/**
 * Puts parked writes back at the end of the outbox. `attempts` stays above 0, so
 * an append is first checked for having landed after all.
 */
export function requeueOutboxEntries(spreadsheetId: string, entries: OutboxEntry[]): void {
  if (!entries.length) return

  const revived = entries.map(({ reverted: _reverted, ...entry }) => entry)

  writeOutbox(spreadsheetId, [...readOutbox(spreadsheetId), ...revived])
}

/** Google's answer to a write into a tab the spreadsheet does not have. */
const MISSING_TAB_ERROR = /unable to parse range/i

/**
 * Appends parked only because their tab was missing, for tabs that exist now:
 * moved back into the outbox. `attempts` stays above 0, so the send first checks
 * that the row did not land after all.
 */
export function requeueMissingTabAppends(
  spreadsheetId: string,
  existingSheets: Iterable<string>
): OutboxEntry[] {
  const existing = new Set([...existingSheets].map(normalizeSheetTitle))
  const failed = getFailedOutboxEntries(spreadsheetId)
  const revived = failed.filter(
    entry =>
      entry.operation.type === 'append' &&
      existing.has(normalizeSheetTitle(entry.operation.sheetName)) &&
      MISSING_TAB_ERROR.test(entry.lastError ?? '')
  )

  if (!revived.length) return []

  writeFailed(
    spreadsheetId,
    failed.filter(entry => !revived.includes(entry))
  )
  requeueOutboxEntries(spreadsheetId, revived)

  return revived
}
