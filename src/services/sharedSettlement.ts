import type { ChartsRecords } from './chartsData'
import {
  computeBalance,
  type SettlementLite,
  type SharedBalance,
  type SharedRecordLite
} from './sharedBalance'
import { getActiveWorkspaceType, type WorkspaceType } from './workspace'
import {
  parseSplit,
  SHARED_CREATOR_FIELD_ID,
  SHARED_PAYER_FIELD_ID,
  SHARED_SPLIT_FIELD_ID
} from '../components/form/sharedFields'
import { parseNumeric } from '../utils/parseNumeric'
import { SETTLEMENT_CATEGORY } from '../utils/protectedCategories'

type Values = Record<string, string | number | undefined>

const email = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const isSettlement = (values: Values) =>
  String(values.category ?? '').trim() === SETTLEMENT_CATEGORY

/**
 * The expense row the settle sheet writes: `from` is its payer and `only:<to>` its split, so the
 * row states payer → receiver; `creator` is whoever wrote it. It names no wallet account: it
 * moves no wallet money by itself. Read it back with `settlementOf` / `splitSettlements`.
 */
export function settlementRecord(
  from: string,
  to: string,
  amount: number,
  dateIso: string,
  creator: string
): Record<string, string | number> {
  const payer = email(from)
  const receiver = email(to)

  if (!(amount > 0)) throw new Error('مبلغ تسویه باید بیشتر از صفر باشد')
  if (!payer || !receiver || payer === receiver) throw new Error('تسویه بین دو نفر انجام می‌شود')

  return {
    date: dateIso,
    title: SETTLEMENT_CATEGORY,
    category: SETTLEMENT_CATEGORY,
    amount,
    [SHARED_PAYER_FIELD_ID]: payer,
    [SHARED_SPLIT_FIELD_ID]: `only:${receiver}`,
    [SHARED_CREATOR_FIELD_ID]: email(creator)
  }
}

/** A well-formed «تسویه» row → who paid whom how much; null for any other or malformed row. */
export function settlementOf(values: Values): SettlementLite | null {
  if (!isSettlement(values)) return null

  const from = email(values[SHARED_PAYER_FIELD_ID])
  const split = parseSplit(String(values[SHARED_SPLIT_FIELD_ID] ?? ''))
  const amount = parseNumeric(values.amount)

  if (!from || split === 'equal' || !(amount > 0)) return null

  return { from, to: split.slice('only:'.length), amount }
}

/** A row of a shared account's income or expense tab. */
export interface SharedRow {
  type: 'income' | 'expense'
  values: Values
}

/**
 * The one partition of a shared account's rows: a «تسویه» expense is a settlement and never an
 * expense; a malformed one (no payer, `equal` split, no amount) and a «تسویه» income count on
 * neither side. Every other row is a record for `computeBalance`.
 */
export function splitSettlements(rows: SharedRow[]): {
  records: SharedRecordLite[]
  settlements: SettlementLite[]
} {
  const records: SharedRecordLite[] = []
  const settlements: SettlementLite[] = []

  for (const { type, values } of rows) {
    if (isSettlement(values)) {
      const settlement = type === 'expense' ? settlementOf(values) : null

      if (settlement) settlements.push(settlement)
      continue
    }

    records.push({
      type,
      amount: parseNumeric(values.amount),
      payer: email(values[SHARED_PAYER_FIELD_ID]),
      split: parseSplit(String(values[SHARED_SPLIT_FIELD_ID] ?? ''))
    })
  }

  return { records, settlements }
}

/** The balance straight from the raw rows: what a page calls, so nothing is counted twice. */
export function balanceOfRows(rows: SharedRow[], emails: [string, string]): SharedBalance {
  const { records, settlements } = splitSettlements(rows)

  return computeBalance(records, settlements, emails)
}

/** Who should pay whom to bring the balance to zero; null when nobody owes a whole toman. */
export function suggestSettlement(
  net: Record<string, number>
): { from: string; to: string; amount: number } | null {
  const entries = Object.entries(net)

  if (entries.length < 2) return null

  const [debtor] = entries.reduce((low, entry) => (entry[1] < low[1] ? entry : low))
  const [creditor] = entries.reduce((high, entry) => (entry[1] > high[1] ? entry : high))
  const owed = Math.min(net[creditor], -net[debtor])

  return owed >= 1 ? { from: debtor, to: creditor, amount: Math.round(owed) } : null
}

/**
 * A shared account's rows without its settlements: «تسویه» is not spending, so reports, charts,
 * the dashboard and budgets skip it there. Elsewhere the name is the user's own category. Pass
 * the type of the spreadsheet the rows come from (`workspaceTypeOf(id)`); default: the active one.
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
