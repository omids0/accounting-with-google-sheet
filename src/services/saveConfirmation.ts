import { flushOutbox } from './sheetSyncOutbox'
import { getConflictEntries, getFailedOutboxEntries, hasPendingOutbox } from './syncOutbox'

/**
 * How long «در حال ذخیره…» waits for an online send before it admits the row is only queued. A
 * slow Sheets append (several seconds) must not read as «no connection».
 */
export const SAVE_CONFIRM_WAIT_MS = 10_000

export const QUEUED_SAVE_MESSAGE = 'ذخیره شد؛ همین‌که اتصال برقرار شود در شیت می‌نشیند'

export const REFUSED_SAVE_MESSAGE =
  'در شیت ذخیره نشد؛ علتش در وضعیت همگام‌سازی (بالای صفحه) نوشته شده است'

/** `confirmed`: it is in the sheet; `queued`: offline, failed to connect or too slow; `refused`: the sheet said no. */
export type SaveOutcome = 'confirmed' | 'queued' | 'refused'

/** Writes that are stuck for good: refused (parked) or waiting for a «کدام بماند؟» answer. */
function stuckWrites(spreadsheetId: string): Set<string> {
  return new Set(
    [...getFailedOutboxEntries(spreadsheetId), ...getConflictEntries(spreadsheetId)].map(
      entry => entry.id
    )
  )
}

/**
 * Waits (online only) until the outbox settles, at most `waitMs`. `confirmed` only when it really
 * sent everything; offline, a network failure or the cap leave the row `queued`; a write that
 * Google refused (parked) or that hit an edit conflict is `refused`.
 */
export async function waitForSheetConfirmation(
  spreadsheetId: string,
  waitMs = SAVE_CONFIRM_WAIT_MS
): Promise<SaveOutcome> {
  if (!spreadsheetId || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'queued'

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

    if (refused) return 'refused'

    return sent && !hasPendingOutbox(spreadsheetId) ? 'confirmed' : 'queued'
  } finally {
    clearTimeout(timer)
  }
}

/** The save toast: it says «در شیت» only after the outbox confirmed. */
export function savedInSheetMessage(sheetName: string, outcome: SaveOutcome): string {
  if (outcome === 'refused') return REFUSED_SAVE_MESSAGE

  return outcome === 'confirmed' ? `در شیت «${sheetName}» ذخیره شد` : QUEUED_SAVE_MESSAGE
}
