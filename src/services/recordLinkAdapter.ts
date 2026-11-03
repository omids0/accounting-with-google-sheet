import { logActivity, logItemActivity } from './activityLog'
import {
  linkedPaymentIds,
  mirrorDataRows,
  rowsMentioning,
  syncNotes,
  syncRecordPayments,
  withoutRecordPayments,
  type LinkedPayment,
  type RecordChange,
  type RecordLinkAdapter
} from './recordLinkCore'
import { updateSheetRow } from './sheets'
import { formatAmountWords } from '../utils/insightText'

/** An item with a list of payments: a personal debt or a receivable (a check and an installment have their own adapters). */
interface PaidItem {
  id: string
  amount: number
  payments: LinkedPayment[]
}

interface PaidItemKind<T extends PaidItem> {
  kind: string
  /** «بدهی» / «طلب». */
  noun: string
  recordType: 'income' | 'expense'
  sheetName: string
  rowToItem: (row: string[], rowNumber: number) => T & { rowNumber: number }
  /** Every item of the tab, from the local mirror when it is loaded. */
  fetchItems: (spreadsheetId: string) => Promise<(T & { rowNumber: number })[]>
  /** The item with what is derived from its payments recomputed (a debt's legacy paid columns). */
  withState: (item: T) => T
  toRow: (item: T) => string[]
  titleOf: (item: T) => string
}

/**
 * The adapter of one item kind. It finds items through the local mirror only (a tab that is absent
 * or empty costs nothing), and writes through the item's own row writer on the freshest row by id.
 */
export function createRecordLinkAdapter<T extends PaidItem>(
  config: PaidItemKind<T>
): RecordLinkAdapter {
  const { noun, sheetName } = config

  const itemsOf = (spreadsheetId: string, recordId: string) =>
    rowsMentioning(spreadsheetId, sheetName, recordId)
      .map(({ row, rowNumber }) => config.rowToItem(row, rowNumber))
      .filter(item => linkedPaymentIds(item.payments, recordId).length)

  /** The same items, read again by id so another device's newer payments are kept. */
  const freshItemsOf = async (spreadsheetId: string, recordId: string) => {
    const ids = new Set(itemsOf(spreadsheetId, recordId).map(item => item.id))

    if (!ids.size) return []

    return (await config.fetchItems(spreadsheetId)).filter(item => ids.has(item.id))
  }

  const write = (spreadsheetId: string, item: T & { rowNumber: number }, payments: T['payments']) =>
    updateSheetRow(
      spreadsheetId,
      sheetName,
      item.rowNumber,
      config.toRow(config.withState({ ...item, payments }))
    )

  return {
    kind: config.kind,
    noun,
    recordType: config.recordType,

    linkedRecordIds: spreadsheetId =>
      mirrorDataRows(spreadsheetId, sheetName).flatMap(({ row, rowNumber }) =>
        config
          .rowToItem(row, rowNumber)
          .payments.flatMap(payment =>
            payment.transactionRecordId ? [payment.transactionRecordId] : []
          )
      ),

    findByRecordId: (spreadsheetId, recordId) =>
      itemsOf(spreadsheetId, recordId).map(item => ({
        kind: config.kind,
        noun,
        itemId: item.id,
        title: config.titleOf(item),
        paymentIds: linkedPaymentIds(item.payments, recordId)
      })),

    async onRecordDeleted(spreadsheetId, recordId) {
      const notes: string[] = []

      for (const item of await freshItemsOf(spreadsheetId, recordId)) {
        const removed = item.payments.filter(payment => payment.transactionRecordId === recordId)

        // Only the payments are taken off the row; the record is already gone and so is its balance effect.
        await write(spreadsheetId, item, withoutRecordPayments(item.payments, recordId))
        logActivity(spreadsheetId, {
          action: 'unpay',
          module: config.kind,
          itemId: item.id,
          summary: `پرداخت ${formatAmountWords(
            removed.reduce((sum, payment) => sum + payment.amount, 0)
          )} از ${noun} «${config.titleOf(item)}» با حذف تراکنش وصل‌شده برداشته شد`
        })
        notes.push(`پرداخت وصل‌شده به ${noun} «${config.titleOf(item)}» هم برداشته شد.`)
      }

      return notes
    },

    async onRecordUpdated(spreadsheetId, recordId, change: RecordChange) {
      const notes: string[] = []

      for (const item of await freshItemsOf(spreadsheetId, recordId)) {
        const result = syncRecordPayments(item.payments, recordId, change, item.amount)

        if (result.changed) {
          await write(spreadsheetId, item, result.payments)
          logItemActivity(spreadsheetId, 'update', config.kind, item.id, config.titleOf(item))
        }
        notes.push(...syncNotes(result, noun, config.titleOf(item)))
      }

      return notes
    }
  }
}
