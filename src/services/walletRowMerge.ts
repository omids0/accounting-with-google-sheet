import { rowsMatchForCompare } from './sheetsCellValues'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'

/** «موجودی» in the wallet tab (see WALLET_HEADERS). */
export const WALLET_BALANCE_COLUMN = 3

const balanceOf = (row: readonly string[]): number =>
  roundMoney(parseNumeric(row[WALLET_BALANCE_COLUMN]))

/**
 * The balance a write that moved an account by `mine - base` must leave, given the balance the
 * sheet holds now. Rounded to two decimals, so fractional balances do not collect float noise.
 */
export function mergedBalance(
  base: readonly string[],
  mine: readonly string[],
  current: readonly string[]
): number {
  return roundMoney(balanceOf(current) + roundMoney(balanceOf(mine) - balanceOf(base)))
}

/** `row` with the cells that only a balance move changes emptied, to tell a move from an edit. */
function withoutBalance(row: string[], writerColumn: number): string[] {
  const copy = [...row]

  copy[WALLET_BALANCE_COLUMN] = ''
  if (writerColumn >= 0) copy[writerColumn] = ''

  return copy
}

export interface WalletRowMerge {
  /** The row to write: this write's cells, with the balance re-based on the sheet's. */
  row: string[]
  /** The sheet's row differs from the base only in balance (and writer): nobody edited the account. */
  balanceOnly: boolean
}

/**
 * Re-bases a queued wallet row write onto the row the sheet holds now: the balance cell becomes
 * `current balance + (this write's balance - its base balance)`, every other cell is this write's.
 * A transfer is two writes, one per account, and each merges on its own. `null` when the write
 * has no base (queued by an older build) or the sheet row is gone: written as is.
 */
export function mergeQueuedWalletRow(
  mine: string[],
  base: string[] | undefined,
  current: string[] | undefined,
  writerColumn = -1
): WalletRowMerge | null {
  if (!base || !current) return null

  const balance = mergedBalance(base, mine, current)

  // Nothing moved on the sheet meanwhile: the write goes out exactly as queued.
  const row = balance === balanceOf(mine) ? mine : [...mine]

  if (row !== mine) row[WALLET_BALANCE_COLUMN] = String(balance)

  return {
    row,
    balanceOnly: rowsMatchForCompare(
      withoutBalance(base, writerColumn),
      withoutBalance(current, writerColumn)
    )
  }
}
