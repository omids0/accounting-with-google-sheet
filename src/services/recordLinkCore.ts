import { getSheetDataRows } from './spreadsheetStore'
import { paidTotal } from '../utils/paymentLedger'

/** The part of a payment (debt, receivable) that points at a record. */
export interface LinkedPayment {
  id: string
  amount: number
  paidAt: string
  transactionRecordId?: string
}

/** One item (a debt, a receivable…) that has payments pointing at a record. */
export interface RecordLinkMatch {
  kind: string
  /** «بدهی» / «طلب»: how the item is named to the user. */
  noun: string
  itemId: string
  title: string
  paymentIds: string[]
}

/** What changed on an edited record; a key is present only when that value really changed. */
export interface RecordChange {
  amount?: number
  date?: string
}

/**
 * What an item kind (personal debts, receivables, checks, installments) does when the
 * income or expense record its payments point at is edited or deleted. Every method works on the
 * local mirror of the sheets and resolves with the Persian notes to show the user; none may
 * delete the record again or move a wallet balance (the record operation did that itself).
 */
export interface RecordLinkAdapter {
  kind: string
  noun: string
  /** The record type its payments are made of. */
  recordType: 'income' | 'expense'
  /** Local, synchronous, no network: the items whose payments point at `recordId`. */
  findByRecordId(spreadsheetId: string, recordId: string): RecordLinkMatch[]
  onRecordDeleted(spreadsheetId: string, recordId: string): Promise<string[]>
  onRecordUpdated(spreadsheetId: string, recordId: string, change: RecordChange): Promise<string[]>
}

/**
 * The rows of a tab that mention `recordId` in any cell, from the local mirror. A tab that is not
 * in the mirror (never created, or not synced) has none, and nothing is fetched.
 */
export function rowsMentioning(
  spreadsheetId: string,
  sheetName: string,
  recordId: string
): { row: string[]; rowNumber: number }[] {
  return (getSheetDataRows(spreadsheetId, sheetName) ?? [])
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some(cell => cell.includes(recordId)))
}

export function linkedPaymentIds(payments: readonly LinkedPayment[], recordId: string): string[] {
  return payments.filter(item => item.transactionRecordId === recordId).map(item => item.id)
}

/** The payments left once those pointing at `recordId` are gone (the same array when none did). */
export function withoutRecordPayments<P extends LinkedPayment>(
  payments: P[],
  recordId: string
): P[] {
  return payments.some(item => item.transactionRecordId === recordId)
    ? payments.filter(item => item.transactionRecordId !== recordId)
    : payments
}

export interface SyncedPayments<P> {
  payments: P[]
  changed: boolean
  /** The amount changed but several payments share the record: nothing was guessed. */
  split: boolean
  /** The payments now add up to more than the item's amount. */
  over: boolean
}

/**
 * Follows an edited record: a single linked payment takes the new amount; every linked payment
 * takes the new date. A record that feeds several payments keeps their amounts (the split is the
 * user's to fix).
 */
export function syncRecordPayments<P extends LinkedPayment>(
  payments: P[],
  recordId: string,
  change: RecordChange,
  itemAmount: number
): SyncedPayments<P> {
  const count = linkedPaymentIds(payments, recordId).length

  const split = count > 1 && change.amount !== undefined

  const takesAmount = count === 1 && change.amount !== undefined

  if (!count) return { payments, changed: false, split: false, over: false }

  const next = payments.map(item =>
    item.transactionRecordId !== recordId
      ? item
      : {
          ...item,
          ...(takesAmount ? { amount: change.amount ?? item.amount } : {}),
          ...(change.date !== undefined ? { paidAt: change.date } : {})
        }
  )

  return {
    payments: next,
    changed: takesAmount || change.date !== undefined,
    split,
    over: takesAmount && paidTotal(next) > itemAmount
  }
}

/** The notes of a sync result, in the user's words. */
export function syncNotes(
  result: Pick<SyncedPayments<unknown>, 'split' | 'over'>,
  noun: string,
  title: string
): string[] {
  const notes: string[] = []

  if (result.split) {
    notes.push(
      `مبلغ این تراکنش بین چند پرداخت ${noun} «${title}» تقسیم شده است؛ تقسیم را خودتان اصلاح کنید.`
    )
  }
  if (result.over) {
    notes.push(
      `مجموع پرداخت‌های ${noun} «${title}» از مبلغ ${noun} بیشتر شد؛ باقی‌مانده صفر نمایش داده می‌شود.`
    )
  }

  return notes
}
