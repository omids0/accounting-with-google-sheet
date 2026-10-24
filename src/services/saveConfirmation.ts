import { flushOutbox } from './sheetSyncOutbox'
import { getConflictEntries, getFailedOutboxEntries, hasPendingOutbox } from './syncOutbox'

/** How long a «ذخیره شد» toast waits for the sheet before it admits the row is only queued. */
export const SAVE_CONFIRM_WAIT_MS = 1500

export const QUEUED_SAVE_MESSAGE = 'ذخیره شد؛ همین‌که اتصال برقرار شود در شیت می‌نشیند'

/** Writes that are stuck for good: refused (parked) or waiting for a «کدام بماند؟» answer. */
function stuckWrites(spreadsheetId: string): Set<string> {
  return new Set(
    [...getFailedOutboxEntries(spreadsheetId), ...getConflictEntries(spreadsheetId)].map(
      entry => entry.id
    )
  )
}

/**
 * True once the outbox has really sent everything (the row is in the sheet). False when offline,
 * when a write was refused or is still pending after `waitMs`: then the row is only queued.
 */
export async function waitForSheetConfirmation(
  spreadsheetId: string,
  waitMs = SAVE_CONFIRM_WAIT_MS
): Promise<boolean> {
  if (!spreadsheetId || (typeof navigator !== 'undefined' && !navigator.onLine)) return false

  const stuckBefore = stuckWrites(spreadsheetId)

  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<boolean>(resolve => {
    timer = setTimeout(() => resolve(false), waitMs)
  })

  try {
    const sent = await Promise.race([flushOutbox(spreadsheetId).catch(() => false), timeout])

    // A write the sheet refused leaves the queue too (it is parked): the queue being empty is not
    // enough, no new parked or conflicting write may have appeared.
    const refused = [...stuckWrites(spreadsheetId)].some(id => !stuckBefore.has(id))

    return sent && !refused && !hasPendingOutbox(spreadsheetId)
  } finally {
    clearTimeout(timer)
  }
}

/** The save toast: it says «در شیت» only after the outbox confirmed. */
export function savedInSheetMessage(sheetName: string, confirmed: boolean): string {
  return confirmed ? `در شیت «${sheetName}» ذخیره شد` : QUEUED_SAVE_MESSAGE
}
