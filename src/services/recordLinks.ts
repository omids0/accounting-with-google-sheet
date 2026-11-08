import { checkExpenseRecordLink, checkIncomeRecordLink } from './checkRecordLink'
import { dangRecordLink } from './dangRecordLink'
import { installmentRecordLink } from './installmentRecordLink'
import type { CustomForm } from '../types'
import { receivableRecordLink } from './receivableRecordLink'
import type { RecordChange, RecordLinkAdapter, RecordLinkMatch } from './recordLinkCore'
import { isPersonalWorkspace } from './workspace'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'
import { handleSheetError } from '../utils/sheetError'
import { showInfo } from '../utils/toast'

type RecordType = CustomForm['type']

/**
 * Everything whose payments can point at an income or expense record. A new kind plugs in here
 * with its own adapter; recordsMutations and the record detail panel need no change. A check pays
 * with an expense (given) or an income (received), so it has one adapter for each.
 */
const ADAPTERS: RecordLinkAdapter[] = [
  dangRecordLink,
  receivableRecordLink,
  checkExpenseRecordLink,
  checkIncomeRecordLink,
  installmentRecordLink
]

/** Buildings and shared accounts keep their own payment flows, so only personal books sync. */
const adaptersFor = (spreadsheetId: string, type: RecordType) =>
  isPersonalWorkspace(spreadsheetId) ? ADAPTERS.filter(item => item.recordType === type) : []

/** The items a record is linked to, from the local mirror (no network). */
export function findLinkedItems(
  spreadsheetId: string,
  recordId: string,
  type: RecordType
): RecordLinkMatch[] {
  return adaptersFor(spreadsheetId, type).flatMap(item =>
    item.findByRecordId(spreadsheetId, recordId)
  )
}

/**
 * True when the record's amount is split: it pays more than one item (debt, receivable, …), or one
 * item only part of its amount (the other shares were taken back). Editing such a record's amount
 * would overwrite a share with the whole amount.
 */
function isSplitRecord(
  spreadsheetId: string,
  recordId: string,
  type: RecordType,
  recordAmount: number
): boolean {
  const matches = findLinkedItems(spreadsheetId, recordId, type)

  if (matches.length > 1) return true

  return matches.length === 1 && (matches[0].amount ?? recordAmount) < recordAmount
}

/**
 * True when the record pays something besides this one payment of `itemId`: another item, or a
 * second payment of the same item. Taking that payment back must not delete the record then.
 */
export function isRecordSharedElsewhere(
  spreadsheetId: string,
  recordId: string,
  type: RecordType,
  itemId: string
): boolean {
  return findLinkedItems(spreadsheetId, recordId, type).some(
    match => match.itemId !== itemId || match.paymentIds.length > 1
  )
}

/** Why an edit cannot change the amount of a record that pays several things ('' when it can). */
export function sharedAmountLockMessage(
  spreadsheetId: string,
  recordId: string,
  type: RecordType,
  before: Record<string, string | number | undefined>,
  after: Record<string, string | number | undefined>
): string {
  if (recordChangeOf(before, after).amount === undefined) return ''
  if (!isSplitRecord(spreadsheetId, recordId, type, amountOf(before))) return ''

  return 'مبلغ این تراکنش بین چند پرداخت (بدهی یا طلب) تقسیم شده است؛ اول پرداخت‌ها را از صفحهٔ آن بدهی یا طلب بردار، بعد مبلغ را عوض کن.'
}

/**
 * True when ANY module (debt or receivable payment, check, installment) has a payment pointing at
 * the record. Personal books only (buildings and shared accounts keep their own flows), from the
 * local mirror. Every writer that must not offer a settled record again asks this one function.
 */
export function isRecordLinked(spreadsheetId: string, recordId: string, type: RecordType): boolean {
  return findLinkedItems(spreadsheetId, recordId, type).length > 0
}

/** Runs every adapter; one that fails is reported and never stops the others or the record operation. */
async function runAdapters(
  spreadsheetId: string,
  type: RecordType,
  action: (adapter: RecordLinkAdapter) => Promise<string[]>,
  failure: string
): Promise<string[]> {
  const notes: string[] = []

  for (const adapter of adaptersFor(spreadsheetId, type)) {
    try {
      notes.push(...(await action(adapter)))
    } catch (err) {
      handleSheetError(err, { fallbackMessage: `${failure} ${adapter.noun} به‌روز نشد` })
    }
  }
  notes.forEach(note => showInfo(note, 7000))

  return notes
}

/**
 * The record is really deleted (the undo window is over): the payments that point at it leave their
 * debt or receivable. The record itself and its balance effect are not touched again.
 */
export function syncLinkedOnRecordDeleted(
  spreadsheetId: string,
  recordId: string,
  type: RecordType
): Promise<string[]> {
  return runAdapters(
    spreadsheetId,
    type,
    adapter => adapter.onRecordDeleted(spreadsheetId, recordId),
    'تراکنش حذف شد ولی پرداخت'
  )
}

/**
 * Finishes a record delete that was cut short: every payment (instalment, check, debt or receivable
 * payment) that points at a record `recordExists` does not know is taken off its item, exactly as
 * `syncLinkedOnRecordDeleted` does when the delete is live. Silent: no toast, and a failure leaves
 * the item as it was for the next start. Personal books only. Returns how many records it settled.
 */
export async function reopenLinksToMissingRecords(
  spreadsheetId: string,
  recordExists: (recordId: string) => boolean
): Promise<number> {
  if (!isPersonalWorkspace(spreadsheetId)) return 0

  let settled = 0

  for (const adapter of ADAPTERS) {
    const missing = new Set(adapter.linkedRecordIds(spreadsheetId).filter(id => !recordExists(id)))

    for (const recordId of missing) {
      try {
        await adapter.onRecordDeleted(spreadsheetId, recordId)
        settled += 1
      } catch {
        /* still linked: the next start tries again */
      }
    }
  }

  return settled
}

const amountOf = (values: Record<string, string | number | undefined>) =>
  roundMoney(Math.abs(parseNumeric(String(values.amount ?? ''))))

/** What differs between the record's old and new values that a payment follows. */
export function recordChangeOf(
  before: Record<string, string | number | undefined>,
  after: Record<string, string | number | undefined>
): RecordChange {
  const amount = amountOf(after)

  const date = String(after.date ?? '')

  return {
    ...(amount > 0 && amount !== amountOf(before) ? { amount } : {}),
    ...(date && date !== String(before.date ?? '') ? { date } : {})
  }
}

/**
 * The record was saved: its linked payment follows the new amount and date. The link stays even if
 * the category moves away from «بدهی» / «طلب». Notes (split record, payments above the amount) are
 * shown as toasts and returned.
 */
export async function syncLinkedOnRecordUpdated(
  spreadsheetId: string,
  recordId: string,
  type: RecordType,
  before: Record<string, string | number | undefined>,
  after: Record<string, string | number | undefined>
): Promise<string[]> {
  const found = recordChangeOf(before, after)

  if (found.amount === undefined && found.date === undefined) return []

  // A record that pays several things keeps their shares: only its date is followed.
  const shared =
    found.amount !== undefined && isSplitRecord(spreadsheetId, recordId, type, amountOf(before))
  const change: RecordChange = shared ? { date: found.date } : found

  if (shared)
    showInfo('مبلغ این تراکنش بین چند پرداخت تقسیم شده است؛ مبلغ پرداخت‌ها عوض نشد.', 7000)
  if (change.date === undefined && change.amount === undefined) return []

  return runAdapters(
    spreadsheetId,
    type,
    adapter => adapter.onRecordUpdated(spreadsheetId, recordId, change),
    'تراکنش ذخیره شد ولی پرداخت'
  )
}
