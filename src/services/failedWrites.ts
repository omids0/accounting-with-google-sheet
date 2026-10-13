import { reapplyFailedWrite } from './failedWriteMirror'
import { flushOutbox, invalidateDerivedCaches, refreshFailedCount } from './sheetSyncOutbox'
import { getSheetRow } from './spreadsheetStore'
import {
  clearFailedOutboxEntries,
  getFailedOutboxEntries,
  getOutboxCount,
  requeueOutboxEntries,
  takeFailedOutboxEntry,
  type OutboxEntry
} from './syncOutbox'
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

function requeue(spreadsheetId: string, entries: OutboxEntry[]): void {
  // Only writes taken back out of the mirror are shown again; the others are still there.
  for (const entry of entries) {
    if (entry.reverted) reapplyFailedWrite(spreadsheetId, entry.operation)
  }
  requeueOutboxEntries(spreadsheetId, entries)
  invalidateDerivedCaches(spreadsheetId)
  setPendingWrites(getOutboxCount(spreadsheetId))
  refreshFailedCount(spreadsheetId)
  void flushOutbox(spreadsheetId)
}

/** «تلاش دوباره»: the parked write goes back into the outbox and is sent again. */
export function retryFailedWrite(spreadsheetId: string, entryId: string): boolean {
  const entry = takeFailedOutboxEntry(spreadsheetId, entryId)

  if (!entry) return false
  requeue(spreadsheetId, [entry])

  return true
}

export function retryAllFailedWrites(spreadsheetId: string): number {
  const entries = getFailedOutboxEntries(spreadsheetId)

  clearFailedOutboxEntries(spreadsheetId)
  requeue(spreadsheetId, entries)

  return entries.length
}

/** «حذف»: forget one parked write; the app keeps the sheet's version of that row. */
export function dismissFailedWrite(spreadsheetId: string, entryId: string): void {
  takeFailedOutboxEntry(spreadsheetId, entryId)
  refreshFailedCount(spreadsheetId)
}
