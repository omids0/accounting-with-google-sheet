import { getItem, setItem } from './storage'
import { roundMoney } from '../utils/roundMoney'

/** Per spreadsheet, on this device: what the wallet difference was each time the app looked. */
export const DIFFERENCE_HISTORY_KEY = 'accounting_wallet_diff_v1'

export interface DifferenceSnapshot {
  /** Epoch ms. */
  at: number
  difference: number
  walletTotal: number
  periodBalance: number
}

/** Enough to cover weeks of daily looks; older ones say little about a new difference. */
const KEEP = 80
/** The same difference is written again only after this long, so the log stays short. */
const REPEAT_MS = 12 * 60 * 60 * 1000

export function readDifferenceHistory(spreadsheetId: string): DifferenceSnapshot[] {
  const store = getItem<Record<string, DifferenceSnapshot[]>>(DIFFERENCE_HISTORY_KEY) ?? {}
  const list = store[spreadsheetId]

  return Array.isArray(list) ? list.filter(item => Number.isFinite(item?.at)) : []
}

/** The look the wallet page just took: accounts as read, and the period it compares them with. */
export function snapshotOf(
  accounts: { balance: number }[],
  flow: { openingBalance: number; totalIncome: number; totalExpense: number },
  at = Date.now()
): DifferenceSnapshot {
  const walletTotal = roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0))
  const periodBalance = roundMoney(flow.openingBalance + flow.totalIncome - flow.totalExpense)

  return { at, difference: roundMoney(walletTotal - periodBalance), walletTotal, periodBalance }
}

/**
 * Notes the difference the wallet page just computed from accounts it really read (an empty or
 * failed read would record a difference that never existed); a no-op when nothing changed. */
export function recordDifference(
  spreadsheetId: string,
  snapshot: DifferenceSnapshot,
  history = readDifferenceHistory(spreadsheetId)
): void {
  const last = history[history.length - 1]

  if (last && last.difference === snapshot.difference && snapshot.at - last.at < REPEAT_MS) return

  try {
    const store = getItem<Record<string, DifferenceSnapshot[]>>(DIFFERENCE_HISTORY_KEY) ?? {}

    setItem(DIFFERENCE_HISTORY_KEY, {
      ...store,
      [spreadsheetId]: [...history, snapshot].slice(-KEEP)
    })
  } catch {
    // Private mode: the history only lasts for this visit; harmless.
  }
}

/**
 * The latest moment the difference changed: the look before it and the first look that saw the
 * new figure. `null` while the history has only ever seen one figure.
 */
export function lastDifferenceChange<T extends { at: number; difference: number }>(
  history: T[]
): { before: T; after: T } | null {
  if (history.length < 2) return null

  const current = history[history.length - 1].difference

  let index = history.length - 1

  while (index > 0 && history[index - 1].difference === current) index -= 1

  return index > 0 ? { before: history[index - 1], after: history[index] } : null
}
