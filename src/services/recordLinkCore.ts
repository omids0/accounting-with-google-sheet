import { getSheetRowsView } from './spreadsheetStore'
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

type Rows = readonly (readonly string[])[]

const ID_CHARS = /^[\w-]+$/

const ID_TOKEN = /[\w-]+/g

/**
 * Token → the rows (indexes into the tab, header included) that contain it, built once per version
 * of the tab: a write replaces the tab's array, so the array is the cache key. A queue build asks
 * for thousands of records; a scan of every row per record made that quadratic.
 */
const tokenIndexes = new WeakMap<Rows, Map<string, number[]>>()

function tokenIndex(rows: Rows): Map<string, number[]> {
  const cached = tokenIndexes.get(rows)

  if (cached) return cached

  const index = new Map<string, number[]>()

  rows.forEach((row, rowIndex) => {
    for (const cell of row) {
      for (const token of cell.match(ID_TOKEN) ?? []) {
        const hits = index.get(token)

        if (!hits) index.set(token, [rowIndex])
        else if (hits[hits.length - 1] !== rowIndex) hits.push(rowIndex)
      }
    }
  })
  tokenIndexes.set(rows, index)

  return index
}

/**
 * The rows of a tab that mention `recordId` in any cell, from the local mirror. A tab that is not
 * in the mirror (never created, or not synced) has none, and nothing is fetched. An id of plain id
 * characters is looked up in the tab's token index; anything else falls back to a scan.
 */
export function rowsMentioning(
  spreadsheetId: string,
  sheetName: string,
  recordId: string
): { row: string[]; rowNumber: number }[] {
  const rows = getSheetRowsView(spreadsheetId, sheetName)

  if (!rows || rows.length <= 1 || !recordId) return []

  const hits = ID_CHARS.test(recordId)
    ? tokenIndex(rows).get(recordId) ?? []
    : rows.flatMap((row, index) => (row.some(cell => cell.includes(recordId)) ? [index] : []))

  // Row 0 is the header; `rowNumber` is the 1-based sheet row, the first data row being 2.
  return hits
    .filter(index => index > 0)
    .map(index => ({ row: [...rows[index]], rowNumber: index + 1 }))
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
