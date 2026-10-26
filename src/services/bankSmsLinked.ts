import {
  isConfirmable,
  LINKED_PAYMENT_DAYS,
  smsDuplicateCandidate,
  type LinkedRecords,
  type LedgerEntry,
  type ReviewedSms
} from './bankSmsQueue'
import type { RecordLinkMatch } from './recordLinkCore'
import { findLinkedItems } from './recordLinks'
import { getSettings } from './settings'
import { toIsoDate } from '../utils/jalaliDate'

function shiftIsoDay(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`)

  date.setDate(date.getDate() + days)

  return toIsoDate(date)
}

/**
 * Which records near the queued SMS are the payment of a debt or receivable. Only records an SMS
 * could be (same direction, within the payment window, the SMS amount or more: an exact match or a
 * part of a bigger payment) are asked, so a long ledger costs one lookup per candidate, never per
 * record. `find` reads the local mirror only (`findLinkedItems`); the queue builder stays pure.
 */
export function linkedRecordsFor(
  entries: ReviewedSms[],
  ledger: LedgerEntry[],
  find: (recordId: string, type: LedgerEntry['type']) => RecordLinkMatch[]
): LinkedRecords {
  const linked = new Map<string, RecordLinkMatch>()
  // The window of every SMS as two ISO dates once, so each record costs string compares only.
  const windows = entries.filter(isConfirmable).map(entry => {
    const { type, amount, date } = smsDuplicateCandidate(entry)

    return {
      type,
      amount,
      from: shiftIsoDay(date, -LINKED_PAYMENT_DAYS),
      to: shiftIsoDay(date, LINKED_PAYMENT_DAYS)
    }
  })
  const couldBe = (record: LedgerEntry) => {
    const day = record.date.slice(0, 10)

    return windows.some(
      win =>
        record.type === win.type && record.amount >= win.amount && day >= win.from && day <= win.to
    )
  }

  for (const record of ledger) {
    if (!record.id || !record.date || linked.has(record.id) || !couldBe(record)) continue

    const match = find(record.id, record.type)[0]

    if (match) linked.set(record.id, match)
  }

  return linked
}

/** `linkedRecordsFor` on the open workbook's local mirror (none in buildings and shared books). */
export function localLinkedRecords(entries: ReviewedSms[], ledger: LedgerEntry[]): LinkedRecords {
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  return linkedRecordsFor(entries, ledger, (recordId, type) =>
    findLinkedItems(spreadsheetId, recordId, type)
  )
}
