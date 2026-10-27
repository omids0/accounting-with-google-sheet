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
  const change = recordChangeOf(before, after)

  if (change.amount === undefined && change.date === undefined) return []

  return runAdapters(
    spreadsheetId,
    type,
    adapter => adapter.onRecordUpdated(spreadsheetId, recordId, change),
    'تراکنش ذخیره شد ولی پرداخت'
  )
}
