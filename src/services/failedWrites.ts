import { reapplyFailedWrite } from './failedWriteMirror'
import {
  dismissFailedWrites,
  flushOutbox,
  invalidateDerivedCaches,
  refreshFailedCount
} from './sheetSyncOutbox'
import { getSheetRow } from './spreadsheetStore'
import {
  clearFailedOutboxEntries,
  getFailedOutboxEntries,
  getOutboxCount,
  requeueOutboxEntries,
  takeFailedOutboxEntry,
  type OutboxEntry
} from './syncOutbox'
import { dropSupersededFailures } from './syncOutboxCoalesce'
import { setPendingWrites } from './syncStatus'
import { formatMoney } from '../utils/formatMoney'
import { parseNumericStrict } from '../utils/parseNumeric'
import { toUserMessage } from '../utils/userMessage'

const ACTION_LABELS: Record<OutboxEntry['operation']['type'], string> = {
  append: 'افزودن',
  update: 'ویرایش',
  delete: 'حذف',
  replace: 'بازنویسی برگه',
  'attachment-upload': 'آپلود پیوست'
}

const TITLE_HEADER = /^(عنوان|نام|شرح|توضیحات)/

const AMOUNT_HEADER = /^مبلغ/

const DATE_HEADER = /^تاریخ(?!چه)/

export interface FailedWriteSummary {
  id: string
  action: string
  sheetName: string
  title: string
  amount: string
  date: string
  cause: string
  /** How many times it was sent and refused or failed. */
  attempts: number
  /** The change was taken back out of the app, which now shows the sheet's version. */
  reverted: boolean
  /** Raw cells and Google's own message, for «کپی جزئیات». */
  rawRow: string[]
  rawError: string
}

/** What a parked write was, in words, using the tab's header row to find the fields. */
export function describeFailedWrite(
  entry: OutboxEntry,
  header: string[] | null
): FailedWriteSummary {
  const { operation } = entry
  const row =
    operation.type === 'delete'
      ? operation.expectedRow ?? []
      : operation.type === 'replace' || operation.type === 'attachment-upload'
      ? []
      : operation.row

  const cell = (pattern: RegExp): string => {
    const index = header?.findIndex(name => pattern.test(String(name ?? '').trim())) ?? -1

    return index >= 0 ? (row[index] ?? '').trim() : ''
  }

  const amountText = cell(AMOUNT_HEADER)
  const amount = parseNumericStrict(amountText)

  return {
    id: entry.id,
    action: ACTION_LABELS[operation.type],
    sheetName: operation.sheetName,
    title: cell(TITLE_HEADER),
    amount: amount === null ? amountText : formatMoney(amount),
    date: cell(DATE_HEADER),
    cause: toUserMessage(entry.lastError, 'خطای نامشخص'),
    attempts: entry.attempts,
    reverted: Boolean(entry.reverted),
    rawRow: row,
    rawError: entry.lastError ?? ''
  }
}

export function getFailedWriteSummaries(spreadsheetId: string): FailedWriteSummary[] {
  return getFailedOutboxEntries(spreadsheetId).map(entry =>
    describeFailedWrite(entry, getSheetRow(spreadsheetId, entry.operation.sheetName, 1))
  )
}

export function formatFailedWriteDetails(summary: FailedWriteSummary): string {
  return [
    `${summary.action} در برگهٔ «${summary.sheetName}»`,
    summary.title && `عنوان: ${summary.title}`,
    summary.amount && `مبلغ: ${summary.amount}`,
    summary.date && `تاریخ: ${summary.date}`,
    `علت: ${summary.cause}`,
    summary.rawRow.length > 0 && `ردیف: ${summary.rawRow.join(' | ')}`,
    summary.rawError && `پیام گوگل: ${summary.rawError}`
  ]
    .filter(Boolean)
    .join('\n')
}

function requeue(spreadsheetId: string, entries: OutboxEntry[]): Promise<boolean> {
  // Only writes taken back out of the mirror are shown again; the others are still there.
  for (const entry of entries) {
    if (entry.reverted) reapplyFailedWrite(spreadsheetId, entry.operation)
  }
  requeueOutboxEntries(spreadsheetId, entries)
  invalidateDerivedCaches(spreadsheetId)
  setPendingWrites(getOutboxCount(spreadsheetId))
  refreshFailedCount(spreadsheetId)

  return flushOutbox(spreadsheetId)
}

/** «تلاش دوباره»: the parked write goes back into the outbox and is sent again. */
export function retryFailedWrite(spreadsheetId: string, entryId: string): boolean {
  const entry = takeFailedOutboxEntry(spreadsheetId, entryId)

  if (!entry) return false
  void requeue(spreadsheetId, [entry])

  return true
}

export function retryAllFailedWrites(spreadsheetId: string): number {
  const entries = getFailedOutboxEntries(spreadsheetId)

  clearFailedOutboxEntries(spreadsheetId)
  void requeue(spreadsheetId, entries)

  return entries.length
}

/** «حذف»: forget one parked write; the app keeps the sheet's version of that row. */
export function dismissFailedWrite(spreadsheetId: string, entryId: string): void {
  takeFailedOutboxEntry(spreadsheetId, entryId)
  refreshFailedCount(spreadsheetId)
}

/** What a «دوباره بفرست» left behind, once the queue was sent again. */
export interface RetryOutcome {
  /** Parked writes that went back into the queue. */
  retried: number
  /** Writes still waiting for a connection or a better moment. */
  pending: number
  /** Writes Google refused again; they stay parked. */
  failed: number
}

/** Sends the parked and the queued writes again and reports what is left. */
export async function retryAllAndWait(spreadsheetId: string): Promise<RetryOutcome> {
  const parked = getFailedOutboxEntries(spreadsheetId)

  clearFailedOutboxEntries(spreadsheetId)
  await (parked.length ? requeue(spreadsheetId, parked) : flushOutbox(spreadsheetId)).catch(
    () => false
  )

  return {
    retried: parked.length,
    pending: getOutboxCount(spreadsheetId),
    failed: getFailedOutboxEntries(spreadsheetId).length
  }
}

/** «حذف عملیات ناموفق»: forgets every parked write; the app keeps the sheet's version. */
export function dismissAllFailedWrites(spreadsheetId: string): number {
  const count = getFailedOutboxEntries(spreadsheetId).length

  dismissFailedWrites(spreadsheetId)

  return count
}

/**
 * Writes parked by Google's «exceeds grid limits» are retried once the grid grows on demand (an
 * older build refused them). Only appends and whole-tab replaces qualify: an update or delete
 * parked by an old build points at a row number that may be stale. A write is revived once: when
 * it fails again it carries a second attempt and stays parked.
 */
const GRID_LIMIT_FAILURE = /exceeds grid limits/i

export function reviveGridLimitFailures(spreadsheetId: string): number {
  let revived = 0

  for (const entry of getFailedOutboxEntries(spreadsheetId)) {
    const { type } = entry.operation

    if (type !== 'append' && type !== 'replace') continue
    if (entry.attempts > 1 || !GRID_LIMIT_FAILURE.test(entry.lastError ?? '')) continue
    if (retryFailedWrite(spreadsheetId, entry.id)) revived += 1
  }

  return revived
}

/** At app start: parked writes that a newer one replaced are dropped, old grid failures retried. */
export function tidyFailedWrites(spreadsheetId: string): number {
  return dropSupersededFailures(spreadsheetId) + reviveGridLimitFailures(spreadsheetId)
}
