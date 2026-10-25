import type { ChartsRecords } from './chartsData'
import type { SettlementLite } from './sharedBalance'
import { getActiveWorkspaceType, type WorkspaceType } from './workspace'
import {
  parseSplit,
  SHARED_PAYER_FIELD_ID,
  SHARED_SPLIT_FIELD_ID
} from '../components/form/sharedFields'
import { parseNumeric } from '../utils/parseNumeric'
import { SETTLEMENT_CATEGORY } from '../utils/protectedCategories'

type Values = Record<string, string | number | undefined>

const isSettlement = (values: Values) =>
  String(values.category ?? '').trim() === SETTLEMENT_CATEGORY

/**
 * The expense row the settle sheet writes: `from` is its payer and `only:<to>` its split, so the
 * row states payer → receiver and, read as an expense, moves the balance exactly like a
 * settlement. It names no wallet account: it moves no wallet money by itself.
 */
export function settlementRecord(
  from: string,
  to: string,
  amount: number,
  dateIso: string
): Record<string, string | number> {
  const payer = from.trim().toLowerCase()
  const receiver = to.trim().toLowerCase()

  if (!(amount > 0)) throw new Error('مبلغ تسویه باید بیشتر از صفر باشد')
  if (!payer || !receiver || payer === receiver) throw new Error('تسویه بین دو نفر انجام می‌شود')

  return {
    date: dateIso,
    title: SETTLEMENT_CATEGORY,
    category: SETTLEMENT_CATEGORY,
    amount,
    [SHARED_PAYER_FIELD_ID]: payer,
    [SHARED_SPLIT_FIELD_ID]: `only:${receiver}`
  }
}

/** A «تسویه» row → who paid whom how much; null for any other record. */
export function settlementOf(values: Values): SettlementLite | null {
  if (!isSettlement(values)) return null

  const from = String(values[SHARED_PAYER_FIELD_ID] ?? '')
    .trim()
    .toLowerCase()
  const split = parseSplit(String(values[SHARED_SPLIT_FIELD_ID] ?? ''))
  const amount = parseNumeric(values.amount)

  if (!from || split === 'equal' || !(amount > 0)) return null

  return { from, to: split.slice('only:'.length), amount }
}

/** Who should pay whom to bring the balance to zero; null when nobody owes. */
export function suggestSettlement(
  net: Record<string, number>
): { from: string; to: string; amount: number } | null {
  const entries = Object.entries(net)

  if (entries.length < 2) return null

  const [debtor] = entries.reduce((low, entry) => (entry[1] < low[1] ? entry : low))
  const [creditor] = entries.reduce((high, entry) => (entry[1] > high[1] ? entry : high))
  const amount = Math.round(Math.min(net[creditor], -net[debtor]))

  return amount > 0 ? { from: debtor, to: creditor, amount } : null
}

/**
 * A shared account's rows without its settlements: «تسویه» is not spending, so reports, charts,
 * the dashboard and budgets skip it there. Elsewhere the name is the user's own category.
 */
export function withoutSettlementRows<T extends { values: Values }>(
  rows: T[],
  type: WorkspaceType = getActiveWorkspaceType()
): T[] {
  return type === 'shared' ? rows.filter(row => !isSettlement(row.values)) : rows
}

/** `withoutSettlementRows` on both sides of the report records. */
export function withoutSettlements(
  records: ChartsRecords,
  type: WorkspaceType = getActiveWorkspaceType()
): ChartsRecords {
  if (type !== 'shared') return records

  return {
    ...records,
    incomeRecords: withoutSettlementRows(records.incomeRecords, type),
    expenseRecords: withoutSettlementRows(records.expenseRecords, type)
  }
}
