import { bridgeReference, pocketReceivable } from './bridgeRows'
import { paidAmount, receivableToRow, rowToReceivable } from './receivablesRow'
import { RECEIVABLES_SHEET } from './sheetNames'
import type { OutboxOperation } from './syncOutbox'
import type { Receivable } from '../types'

/**
 * Keeping the bridged personal receivable in step with its building expense (round 11, Step 8).
 * Pure: the rows come from a direct read of the personal sheet, like the payment bridge.
 */

/** Added to the note of a paid receivable whose expense was deleted. */
export const BRIDGE_DELETED_NOTE = 'هزینه حذف شد'

/** Added to the note when the expense shrank below what the building already repaid. */
export const BRIDGE_FLOOR_NOTE = 'مبلغ هزینه کمتر شد؛ به اندازهٔ پرداخت‌شده ماند'

export interface BridgeSyncInput {
  kind: 'edit' | 'delete'
  recordId: string
  /** The edited expense (ignored for a delete). */
  title: string
  amount: number
  /** ISO date of the edited expense. */
  date: string
  /** Header included, as a direct read of the personal sheet returned them. */
  receivableRows: string[][]
}

const NOTE_SEPARATOR = ' · '

/** The note without the two notes this bridge adds, then with `extra` when it is given. */
function noteWith(note: string, extra: string | null): string {
  const base = note
    .split(NOTE_SEPARATOR)
    .filter(part => part !== BRIDGE_DELETED_NOTE && part !== BRIDGE_FLOOR_NOTE)
    .join(NOTE_SEPARATOR)

  return extra ? [base, extra].filter(Boolean).join(NOTE_SEPARATOR) : base
}

/**
 * What to write to the personal sheet for an edited or deleted building expense, or null when
 * nothing changes (the receivable is gone, or already says the same). A receivable never shrinks
 * below what was paid on it, and a paid one is kept on delete (marked) instead of removed; an
 * unpaid one follows the edit in place and is deleted with the expense.
 */
export function bridgeSyncOperation(input: BridgeSyncInput): OutboxOperation | null {
  const found = input.receivableRows
    .map((row, index) => ({ row, index }))
    .find(
      ({ row, index }) =>
        index > 0 && rowToReceivable(row, index + 1).reference === bridgeReference(input.recordId)
    )

  if (!found) return null

  const receivable = rowToReceivable(found.row, found.index + 1)

  const paid = paidAmount(receivable)

  const rowNumber = found.index + 1

  if (input.kind === 'delete') {
    if (paid === 0) {
      return { type: 'delete', sheetName: RECEIVABLES_SHEET, rowNumber, expectedRow: found.row }
    }

    return updateOf(found.row, rowNumber, {
      ...receivable,
      note: noteWith(receivable.note, BRIDGE_DELETED_NOTE)
    })
  }

  const fresh = pocketReceivable({
    recordId: input.recordId,
    building: receivable.debtor,
    title: input.title,
    amount: input.amount,
    date: input.date,
    email: ''
  })

  return updateOf(found.row, rowNumber, {
    ...receivable,
    title: fresh.title,
    amount: Math.max(input.amount, paid),
    borrowDate: fresh.borrowDate,
    note: noteWith(receivable.note, input.amount < paid ? BRIDGE_FLOOR_NOTE : null)
  })
}

function updateOf(
  expectedRow: string[],
  rowNumber: number,
  next: Receivable
): OutboxOperation | null {
  const row = receivableToRow(next)

  if (
    row.join('\u0000') === receivableToRow(rowToReceivable(expectedRow, rowNumber)).join('\u0000')
  ) {
    return null
  }

  return {
    type: 'update',
    sheetName: RECEIVABLES_SHEET,
    rowNumber,
    expectedRow,
    row,
    writeOptions: { skipActivity: true }
  }
}
