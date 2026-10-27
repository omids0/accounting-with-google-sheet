import {
  DANG_PAYMENTS_COLUMN,
  dangToRow,
  isLegacyDangRow,
  rowToDang,
  withDangPaidState
} from './dangRow'
import { detectReceivableRowLayout, rowToReceivable } from './receivablesRow'
import { DANG_SHEET, RECEIVABLES_SHEET } from './sheetNames'
import { rowsMatchForCompare } from './sheetsCellValues'
import { normalizeSheetTitle } from './sheetsMeta'
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange'
import { getSheetAllRows, updateSheetDataRow } from './spreadsheetStore'
import { DANG_WRITER_COLUMN, RECEIVABLE_WRITER_COLUMN } from './writerColumn'
import { mergePaymentsById } from '../utils/mergePaymentsById'

interface LedgerPayment {
  id: string
}

/** How one tab keeps its payments: read them off a row, and write a ledger back into a row. */
interface PaymentTab {
  readable: (row: string[]) => boolean
  payments: (row: string[]) => LedgerPayment[]
  withPayments: (row: string[], payments: LedgerPayment[]) => string[]
  /** Payments, the paid columns derived from them, and the writer: not an edit of the debt itself. */
  derivedColumns: number[]
}

const RECEIVABLE_PAYMENTS_COLUMN = 8

const TABS: Record<string, PaymentTab> = {
  [normalizeSheetTitle(DANG_SHEET)]: {
    readable: row => !isLegacyDangRow(row),
    payments: row => rowToDang(row, 0).payments,
    withPayments: (row, payments) => {
      const dang = rowToDang(row, 0)

      const next = dangToRow(
        withDangPaidState({ ...dang, payments: payments as typeof dang.payments })
      )

      const merged = [...row]

      for (const column of [8, 9, 10, DANG_PAYMENTS_COLUMN]) merged[column] = next[column]

      return merged
    },
    derivedColumns: [8, 9, 10, DANG_WRITER_COLUMN, DANG_PAYMENTS_COLUMN]
  },
  [normalizeSheetTitle(RECEIVABLES_SHEET)]: {
    readable: row => detectReceivableRowLayout(row) === 'withTitle',
    payments: row => rowToReceivable(row, 0).payments,
    withPayments: (row, payments) => {
      const merged = [...row]

      merged[RECEIVABLE_PAYMENTS_COLUMN] = JSON.stringify(payments)

      return merged
    },
    derivedColumns: [RECEIVABLE_PAYMENTS_COLUMN, RECEIVABLE_WRITER_COLUMN]
  }
}

/** `row` with the cells that only payments change emptied, to tell a payment from a real edit. */
function withoutDerived(row: string[], columns: number[]): string[] {
  const copy = [...row]

  for (const column of columns) copy[column] = ''

  return copy
}

export interface PaymentRowMerge {
  /** The row to write: this write's edit plus every payment the sheet has gained meanwhile. */
  row: string[]
  /** The sheet's row differs from the base only in payments, so nobody else edited the debt. */
  paymentsOnly: boolean
}

/**
 * Re-bases a queued row write onto the row the sheet holds now. Payments merge by id against the
 * base the write was computed from (see mergePaymentsById); every other cell is this write's, and
 * the paid columns are recomputed from the merged ledger. `null` when the tab or the row layout
 * has no payments ledger, or the write has no base (queued by an older build): written as is.
 */
export function mergeQueuedPaymentRow(
  sheetName: string,
  mine: string[],
  base: string[] | undefined,
  current: string[] | undefined
): PaymentRowMerge | null {
  const tab = TABS[normalizeSheetTitle(sheetName)]

  if (!tab || !base || !current) return null
  if (![mine, base, current].every(tab.readable)) return null

  const payments = mergePaymentsById(tab.payments(base), tab.payments(mine), tab.payments(current))

  const minePayments = tab.payments(mine)

  const unchanged =
    payments.length === minePayments.length &&
    payments.every((payment, index) => payment.id === minePayments[index]?.id)

  return {
    row: unchanged ? mine : tab.withPayments(mine, payments),
    paymentsOnly: rowsMatchForCompare(
      withoutDerived(base, tab.derivedColumns),
      withoutDerived(current, tab.derivedColumns)
    )
  }
}

/**
 * The write landed merged: show the merged row too, unless a newer local edit already replaced
 * the row the write carried (that edit is merged when its own turn comes).
 */
export function showMergedRowLocally(
  spreadsheetId: string,
  sheetName: string,
  written: string[],
  merged: string[]
): void {
  if (merged === written) return

  const rows = getSheetAllRows(spreadsheetId, sheetName) ?? []

  const id = String(written[0] ?? '').trim()

  const index = rows.findIndex((row, at) => at > 0 && String(row[0] ?? '').trim() === id)

  if (index < 1 || !rowsMatchForCompare(rows[index], written)) return
  updateSheetDataRow(spreadsheetId, sheetName, index + 1, merged)
  notifySpreadsheetDataChanged(spreadsheetId)
}
