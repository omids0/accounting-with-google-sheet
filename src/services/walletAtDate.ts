import type { MonthlyNetTotals } from './openingBalanceDerive'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'
import { normalizeSheetDate } from '../utils/sheetValues'

type ValueRecord = { values: Record<string, string> }

/** Every income and expense record with the field that holds each one's date. */
export interface WalletFlow {
  incomeRecords: ValueRecord[]
  expenseRecords: ValueRecord[]
  incomeDateField: string
  expenseDateField: string
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Wallet at the end of `monthKey`: today's balance minus the net of every later month. */
export function walletAtMonthEnd(
  walletNow: number,
  monthlyNet: Map<string, MonthlyNetTotals>,
  monthKey: string
): number {
  let later = 0

  for (const [key, totals] of monthlyNet) {
    if (key > monthKey) later += totals.income - totals.expense
  }

  return walletNow - later
}

/** Net (income minus expense) of the records dated after `endIso`; undated records are skipped. */
function netAfter(flow: WalletFlow, endIso: string): number {
  const sumAfter = (records: ValueRecord[], dateField: string): number =>
    records.reduce((sum, record) => {
      const day = normalizeSheetDate(record.values[dateField] ?? '')

      return day > endIso ? sum + parseNumeric(record.values.amount) : sum
    }, 0)

  return roundMoney(
    sumAfter(flow.incomeRecords, flow.incomeDateField) -
      sumAfter(flow.expenseRecords, flow.expenseDateField)
  )
}

/**
 * Wallet balance at the end of `endIso` (that day included): today's balance minus the net of
 * every record dated after it. Works for any day, so it needs no month boundary and no opening
 * balance. `null` when `endIso` is not a date.
 */
export function walletAtDate(walletNow: number, flow: WalletFlow, endIso: string): number | null {
  if (!ISO_DAY.test(endIso)) return null

  return roundMoney(walletNow - netAfter(flow, endIso))
}

/**
 * The wallet a dashboard period counts. A period that reaches today (or the future) uses today's
 * balance; one that ended before today uses the balance at its end, with `walletAsOf` naming that
 * day. An end that cannot be read falls back to today's balance.
 */
export function walletForPeriod(
  walletNow: number,
  flow: WalletFlow,
  periodEndIso: string,
  todayIso: string
): { walletTotal: number; walletAsOf?: string } {
  const endIso = periodEndIso.slice(0, 10)

  if (!ISO_DAY.test(endIso) || endIso >= todayIso) return { walletTotal: walletNow }

  const walletTotal = walletAtDate(walletNow, flow, endIso)

  return walletTotal == null ? { walletTotal: walletNow } : { walletTotal, walletAsOf: endIso }
}
