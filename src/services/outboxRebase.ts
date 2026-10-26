import { isPaymentLedgerSheet } from './paymentLedgerSheets'
import { WALLET_SHEET } from './sheetNames'
import { normalizeSheetTitle } from './sheetsMeta'
import type { RowGuardSession } from './sheetsRowGuard'
import type { OutboxOperation } from './syncOutbox'
import { headerWriterColumn } from '../utils/writerColumn'

type UpdateOperation = Extract<OutboxOperation, { type: 'update' }>

export interface RebasedRow {
  row: string[]
  /**
   * The sheet's row differs from the write's base only in cells this kind of write moves (payments,
   * a balance): nobody edited the item itself, so «کدام بماند؟» is not asked.
   */
  skipConflictCheck: boolean
}

const isWalletSheet = (sheetName: string): boolean =>
  normalizeSheetTitle(sheetName) === normalizeSheetTitle(WALLET_SHEET)

/**
 * The row an update should write. Debts and receivables keep their payments in the row, and an
 * account row keeps its balance (when the write was queued as a change): both are re-based on the
 * row the sheet holds now, so a payment or a balance move made on another device since this write
 * was queued is not overwritten. Anything else, and a write without a base, goes out unchanged.
 */
export async function rebaseOnSheetRow(
  spreadsheetId: string,
  session: RowGuardSession,
  target: { sheetName: string; rowNumber: number },
  operation: UpdateOperation
): Promise<RebasedRow> {
  const own = { row: operation.row, skipConflictCheck: false }

  if (!operation.expectedRow) return own

  const snapshot = session.snapshots.get(target.sheetName)

  const current = snapshot?.[target.rowNumber - 1]

  let merged: { row: string[]; skip: boolean } | null = null

  if (isPaymentLedgerSheet(operation.sheetName)) {
    const { mergeQueuedPaymentRow } = await import('./paymentRowMerge')

    const result = mergeQueuedPaymentRow(
      operation.sheetName,
      operation.row,
      operation.expectedRow,
      current
    )

    merged = result && { row: result.row, skip: result.paymentsOnly }
  } else if (operation.writeOptions?.mergeBalance && isWalletSheet(operation.sheetName)) {
    const { mergeQueuedWalletRow } = await import('./walletRowMerge')

    const result = mergeQueuedWalletRow(
      operation.row,
      operation.expectedRow,
      current,
      headerWriterColumn(snapshot?.[0])
    )

    merged = result && { row: result.row, skip: result.balanceOnly }
  }

  if (!merged) return own

  const { showMergedRowLocally } = await import('./paymentRowMerge')

  showMergedRowLocally(spreadsheetId, operation.sheetName, operation.row, merged.row)

  return { row: merged.row, skipConflictCheck: merged.skip }
}
