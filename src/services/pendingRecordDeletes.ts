import { getItem, removeItem, setItem } from './storage'

/** Per workspace, one key; listed as a prefix in `ACCOUNT_KEY_PREFIXES` (localDataWipe.ts). */
export const PENDING_RECORD_DELETES_PREFIX = 'accounting_pending_record_deletes_'

/** Deletes started in this page: the start-up heal must leave them to the code that runs them. */
const live = new Set<string>()

const keyOf = (spreadsheetId: string) => `${PENDING_RECORD_DELETES_PREFIX}${spreadsheetId}`

const liveKey = (spreadsheetId: string, recordId: string) => `${spreadsheetId}\u0000${recordId}`

/** Ids of the records whose delete was confirmed but may not have finished (marker on this device). */
export function pendingRecordDeleteIds(spreadsheetId: string): string[] {
  const ids = getItem<string[]>(keyOf(spreadsheetId))

  return Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && id) : []
}

/** True while this page itself is deleting the record: not an interrupted delete. */
export function isRecordDeleteLive(spreadsheetId: string, recordId: string): boolean {
  return live.has(liveKey(spreadsheetId, recordId))
}

/**
 * Writes the «delete confirmed» marker. Synchronous on purpose: it runs inside the pagehide event
 * that closes the page, before the first await of the delete. Never throws (full storage must not
 * block a delete; it only loses the safety net).
 */
export function markRecordDeletePending(spreadsheetId: string, recordId: string): void {
  live.add(liveKey(spreadsheetId, recordId))
  try {
    const ids = pendingRecordDeleteIds(spreadsheetId)

    if (!ids.includes(recordId)) setItem(keyOf(spreadsheetId), [...ids, recordId])
  } catch {
    /* storage unavailable: the delete still runs, only the restart safety net is missing */
  }
}

/** The delete finished (row gone), failed visibly, or was superseded by an edit. */
export function clearRecordDeletePending(spreadsheetId: string, recordId: string): void {
  live.delete(liveKey(spreadsheetId, recordId))
  try {
    const rest = pendingRecordDeleteIds(spreadsheetId).filter(id => id !== recordId)

    if (rest.length) setItem(keyOf(spreadsheetId), rest)
    else removeItem(keyOf(spreadsheetId))
  } catch {
    /* nothing to clear */
  }
}

/** For tests: a new page start forgets which deletes this page was running. */
export function resetLiveRecordDeletes(): void {
  live.clear()
}
