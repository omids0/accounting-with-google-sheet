import {
  getFailedOutboxEntries,
  getOutboxEntries,
  removeOutboxEntry,
  takeFailedOutboxEntry,
  type OutboxOperation
} from './syncOutbox'

/** Entries being sent right now: a write on its way cannot be replaced, only followed. */
const inFlight = new Set<string>()

export const markInFlight = (entryId: string): void => void inFlight.add(entryId)

export const clearInFlight = (entryId: string): void => void inFlight.delete(entryId)

const identityOf = (row: readonly string[] | undefined): string => String(row?.[0] ?? '').trim()

/** Two updates of the same record: same tab, same row and the same first cell (id or month). */
function sameRecord(a: OutboxOperation, b: OutboxOperation): boolean {
  return (
    a.type === 'update' &&
    b.type === 'update' &&
    a.sheetName === b.sheetName &&
    a.rowNumber === b.rowNumber &&
    identityOf(a.row) !== '' &&
    identityOf(a.row) === identityOf(b.row)
  )
}

/**
 * A new update replaces every earlier waiting or parked update of the same record (latest wins).
 * The result inherits the \`expectedRow\` of the earliest replaced waiting update: that is the row
 * the sheet really holds, whereas the new update's own base is the unsent local copy.
 */
export function coalesceUpdate(spreadsheetId: string, operation: OutboxOperation): OutboxOperation {
  if (operation.type !== 'update') return operation

  let base = operation.expectedRow
  let inherited = false

  for (const entry of getOutboxEntries(spreadsheetId)) {
    if (entry.conflict || inFlight.has(entry.id) || !sameRecord(entry.operation, operation))
      continue
    if (!inherited && entry.operation.type === 'update') {
      base = entry.operation.expectedRow ?? base
      inherited = true
    }
    removeOutboxEntry(spreadsheetId, entry.id)
  }

  for (const entry of getFailedOutboxEntries(spreadsheetId)) {
    if (sameRecord(entry.operation, operation)) takeFailedOutboxEntry(spreadsheetId, entry.id)
  }

  return base === operation.expectedRow ? operation : { ...operation, expectedRow: base }
}

/** Parked updates that a later parked update of the same record has made pointless: dropped. */
export function dropSupersededFailures(spreadsheetId: string): number {
  const failed = getFailedOutboxEntries(spreadsheetId)

  let dropped = 0

  failed.forEach((entry, index) => {
    if (!failed.slice(index + 1).some(later => sameRecord(later.operation, entry.operation))) return
    takeFailedOutboxEntry(spreadsheetId, entry.id)
    dropped += 1
  })

  return dropped
}

/** Months (first cell) of «موجودی ماهانه»-like tabs with a waiting or parked write on `sheetName`. */
export function queuedIdentities(spreadsheetId: string, sheetName: string): Set<string> {
  const found = new Set<string>()

  for (const entry of [
    ...getOutboxEntries(spreadsheetId),
    ...getFailedOutboxEntries(spreadsheetId)
  ]) {
    const { operation } = entry

    if (operation.sheetName === sheetName && 'row' in operation) {
      found.add(identityOf(operation.row))
    }
  }

  return found
}
