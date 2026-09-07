import { setAccountingStartDate } from './accountingStartDate'
import {
  DERIVED_OPENING_BALANCE_NOTE,
  fetchAllOpeningBalances,
  fetchOpeningBalance,
  setOpeningBalance
} from './monthlyBalance'
import {
  aggregateMonthlyNet,
  deriveOpeningBalances,
  findEarliestRecordDate,
  resolveAccountingStartDate,
  type MonthlyNetTotals
} from './openingBalanceDerive'
import { getAnchorMonthKey, getMembershipDate, setAnchorMonthKey } from './periodSettings'
import { parseJalaliMonthKey } from '../utils/dateRange'
import { findGregorianForJalali, toIsoDate } from '../utils/jalaliDate'

export const ANCHOR_NOTE = 'لنگر دوره — مبنای محاسبه خودکار'

/**
 * Wallet and dashboard both trigger the mirror write. Sharing one in-flight
 * promise stops two concurrent runs from appending the same month twice.
 */
const mirrorInFlight = new Map<string, Promise<number>>()

/**
 * Adopting the anchor writes to the sheet, so concurrent callers (StrictMode
 * double effects, wallet and dashboard together) must share one attempt.
 */
const anchorInFlight = new Map<string, Promise<{ monthKey: string; amount: number }>>()

type ValueRecord = { values: Record<string, string> }

export interface OpeningBalanceContext {
  anchorMonthKey: string
  anchorAmount: number
  openings: Map<string, number>
  monthlyNet: Map<string, MonthlyNetTotals>
  startDate: string
}

export interface OpeningBalanceInput {
  spreadsheetId: string
  incomeRecords: ValueRecord[]
  expenseRecords: ValueRecord[]
  incomeDateField: string
  expenseDateField: string
  walletTotal: number
  currentMonthKey: string
}

export function firstDayOfJalaliMonth(monthKey: string): string {
  const parts = parseJalaliMonthKey(monthKey)

  if (!parts) return ''

  return toIsoDate(findGregorianForJalali(parts.year, parts.month, 1))
}

/**
 * Adopts the anchor month on first run. Whatever opening balance users already
 * have for the current month becomes the anchor, so historical months and this
 * month's numbers are left exactly as they are.
 */
function resolveAnchor(
  spreadsheetId: string,
  currentMonthKey: string,
  walletTotal: number
): Promise<{ monthKey: string; amount: number }> {
  const pending = anchorInFlight.get(spreadsheetId)

  if (pending) return pending

  const task = resolveAnchorUncached(spreadsheetId, currentMonthKey, walletTotal).finally(() => {
    anchorInFlight.delete(spreadsheetId)
  })

  anchorInFlight.set(spreadsheetId, task)

  return task
}

async function resolveAnchorUncached(
  spreadsheetId: string,
  currentMonthKey: string,
  walletTotal: number
): Promise<{ monthKey: string; amount: number }> {
  const storedKey = await getAnchorMonthKey(spreadsheetId).catch(() => '')

  if (storedKey && parseJalaliMonthKey(storedKey)) {
    const existing = await fetchOpeningBalance(spreadsheetId, storedKey)

    return { monthKey: storedKey, amount: existing.amount }
  }

  const existing = await fetchOpeningBalance(spreadsheetId, currentMonthKey)

  const amount = existing.rowNumber != null ? existing.amount : walletTotal

  if (existing.rowNumber == null) {
    await setOpeningBalance(spreadsheetId, currentMonthKey, amount, ANCHOR_NOTE)
  }

  await setAnchorMonthKey(spreadsheetId, currentMonthKey)

  return { monthKey: currentMonthKey, amount }
}

export async function resolveOpeningBalanceContext(
  input: OpeningBalanceInput
): Promise<OpeningBalanceContext> {
  const {
    spreadsheetId,
    incomeRecords,
    expenseRecords,
    incomeDateField,
    expenseDateField,
    walletTotal,
    currentMonthKey
  } = input

  const anchor = await resolveAnchor(spreadsheetId, currentMonthKey, walletTotal)

  const monthlyNet = aggregateMonthlyNet(
    incomeRecords,
    expenseRecords,
    incomeDateField,
    expenseDateField
  )

  const openings = deriveOpeningBalances(
    { monthKey: anchor.monthKey, amount: anchor.amount },
    monthlyNet,
    currentMonthKey
  )

  const membershipDate = await getMembershipDate(spreadsheetId).catch(() => '')

  const earliestRecordDate = findEarliestRecordDate(
    incomeRecords,
    expenseRecords,
    incomeDateField,
    expenseDateField
  )

  const startDate = resolveAccountingStartDate(
    membershipDate,
    earliestRecordDate,
    firstDayOfJalaliMonth(anchor.monthKey)
  )

  setAccountingStartDate(startDate)

  return {
    anchorMonthKey: anchor.monthKey,
    anchorAmount: anchor.amount,
    openings,
    monthlyNet,
    startDate
  }
}

/**
 * Mirrors derived values into «موجودی ماهانه» so reports and the sheet itself
 * stay readable. Correctness never depends on these writes succeeding, and rows
 * that already match are skipped so a steady state produces no writes at all.
 */
export async function syncDerivedOpeningBalances(
  spreadsheetId: string,
  context: OpeningBalanceContext
): Promise<number> {
  const pending = mirrorInFlight.get(spreadsheetId)

  if (pending) return pending

  const task = writeDerivedOpeningBalances(spreadsheetId, context).finally(() => {
    mirrorInFlight.delete(spreadsheetId)
  })

  mirrorInFlight.set(spreadsheetId, task)

  return task
}

async function writeDerivedOpeningBalances(
  spreadsheetId: string,
  context: OpeningBalanceContext
): Promise<number> {
  const stored = await fetchAllOpeningBalances(spreadsheetId).catch(() => [])

  const storedByMonth = new Map(stored.map(item => [item.monthKey, item]))

  let written = 0

  for (const [monthKey, amount] of context.openings) {
    if (monthKey === context.anchorMonthKey) continue

    const existing = storedByMonth.get(monthKey)

    if (existing && existing.amount === amount) continue

    await setOpeningBalance(spreadsheetId, monthKey, amount, DERIVED_OPENING_BALANCE_NOTE, {
      skipRevision: true
    })
    written += 1
  }

  return written
}
