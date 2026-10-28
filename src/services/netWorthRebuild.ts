import { checksOfDirection } from './checkDirection'
import { applyNetAvailableConfig } from './dashboardNetAvailable'
import { totalInstallmentsInRange } from './installmentsCalculations'
import type { NetWorthSnapshot } from './netWorth'
import type { MonthlyNetTotals } from './openingBalanceDerive'
import { computeHoldings } from './treasuryHoldings'
import { walletAtMonthEnd } from './walletAtDate'
import type {
  Check,
  CheckDirection,
  Dang,
  InstallmentPlan,
  NetAvailableConfig,
  Receivable,
  VaultAsset,
  VaultTransaction
} from '../types'
import { getJalaliMonthRange, isDateInRange, type DateRange } from '../utils/dateRange'
import { remainingOf } from '../utils/paymentLedger'
import { normalizeSheetDate } from '../utils/sheetValues'

/** Everything the rebuild reads; today's balances plus the dated history behind them. */
export interface NetWorthRebuildInput {
  /** Wallet balance today. */
  walletTotal: number
  /** Income and expense per Jalali month (`aggregateMonthlyNet`). */
  monthlyNet: Map<string, MonthlyNetTotals>
  vaultTransactions: VaultTransaction[]
  /** tgju prices; `null` leaves the vault out (as the dashboard does without prices). */
  prices: Record<string, number> | null
  catalog?: VaultAsset[]
  /** Goal balances today. */
  goalsTotal: number
  receivables: Receivable[]
  installmentPlans: InstallmentPlan[]
  checks: Check[]
  dangs: Dang[]
}

function isOnOrBefore(date: string, endIso: string): boolean {
  const iso = normalizeSheetDate(date)

  return iso !== '' && iso <= endIso
}

/** The day of a pass/pay stamp: an ISO date, or a Persian locale string whose day comes before the time. */
function stampDay(stamp: string): string {
  return normalizeSheetDate(stamp.split(/[،,s]/)[0])
}

/** Vault holdings bought by `endIso`, valued at today's prices. */
function vaultAt(input: NetWorthRebuildInput, endIso: string): number {
  if (!input.prices) return 0

  const held = input.vaultTransactions.filter(tx => isOnOrBefore(tx.transactionDate, endIso))

  return computeHoldings(held, input.prices, input.catalog).reduce(
    (sum, holding) => sum + holding.totalValue,
    0
  )
}

/** What borrowers still owed at `endIso`: lent by then, minus repayments by then. */
function receivablesAt(receivables: Receivable[], endIso: string): number {
  return receivables
    .filter(item => isOnOrBefore(item.borrowDate, endIso))
    .reduce((sum, item) => {
      const repaid = item.payments
        .filter(payment => isOnOrBefore(payment.paidAt, endIso))
        .reduce((total, payment) => total + payment.amount, 0)

      return sum + Math.max(0, item.amount - repaid)
    }, 0)
}

/**
 * What was still owed on debts at `endIso`: dated by then, minus the payments made by then. A
 * payment whose date cannot be read counts as made (an old paid debt without a date stays out,
 * as it did before payments could be partial).
 */
function dangsAt(dangs: Dang[], endIso: string): number {
  return dangs
    .filter(item => isOnOrBefore(item.date, endIso))
    .reduce((sum, item) => {
      const paid = item.payments.filter(payment => {
        const day = stampDay(payment.paidAt)

        return !day || day <= endIso
      })

      return sum + remainingOf(item.amount, paid)
    }, 0)
}

function openAt(check: Check, endIso: string): boolean {
  if (!check.paid) return true

  const paidOn = stampDay(check.paidAt)

  return Boolean(paidOn) && paidOn > endIso
}

/**
 * Checks of one type due inside the month. A payable is the debt of that month whatever it is
 * today. A received check is an asset only while it is not cashed: one passed by the month's end
 * is already in the wallet, and counting it too would count the money twice (a pass date that
 * cannot be read counts as passed).
 */
function checksDueIn(checks: Check[], range: DateRange, direction: CheckDirection): number {
  return checksOfDirection(checks, direction)
    .filter(check => isDateInRange(check.dueDate, range))
    .filter(check => direction === 'paid' || openAt(check, range.end))
    .reduce((sum, check) => sum + check.amount, 0)
}

/**
 * Month-end values of a past month, approximated as round 5 documented: wallet
 * from today's balance and the monthly net flow, vault holdings of that time at
 * today's prices, goals at today's balance, receivables as of that month, and
 * installments/checks due in that month; debts dated by then, minus their payments by then.
 */
export function rebuildMonthValues(
  input: NetWorthRebuildInput,
  monthKey: string,
  config: NetAvailableConfig
): Pick<NetWorthSnapshot, 'netWorth' | 'assets' | 'liabilities'> | null {
  const range = getJalaliMonthRange(monthKey)

  if (!range) return null

  const vault = vaultAt(input, range.end)
  const { totalAssets, totalLiabilities, netAvailable } = applyNetAvailableConfig(
    {
      walletTotal: walletAtMonthEnd(input.walletTotal, input.monthlyNet, monthKey),
      treasuryTotal: vault + input.goalsTotal,
      goalsTotal: input.goalsTotal,
      receivablesTotal: receivablesAt(input.receivables, range.end),
      installmentsDue: totalInstallmentsInRange(input.installmentPlans, range),
      checksDue: checksDueIn(input.checks, range, 'paid'),
      checksReceivable: checksDueIn(input.checks, range, 'received'),
      dangsTotal: dangsAt(input.dangs, range.end)
    },
    config
  )

  return { netWorth: netAvailable, assets: totalAssets, liabilities: totalLiabilities }
}

/** `rebuilt` rows for `monthKeys`, oldest first. */
export function rebuildSnapshots(
  input: NetWorthRebuildInput,
  monthKeys: string[],
  config: NetAvailableConfig,
  recordedAt: string
): NetWorthSnapshot[] {
  return monthKeys.flatMap(monthKey => {
    const values = rebuildMonthValues(input, monthKey, config)

    return values ? [{ monthKey, ...values, recordedAt, source: 'rebuilt' as const }] : []
  })
}

/** The first month with an income or expense record. */
export function earliestNetMonth(monthlyNet: Map<string, MonthlyNetTotals>): string | null {
  const keys = [...monthlyNet.keys()].sort()

  return keys[0] ?? null
}

/** True when an income or expense record is dated after `monthKey` (today's wallet is then not that month's). */
export function hasFlowAfterMonth(
  monthlyNet: Map<string, MonthlyNetTotals>,
  monthKey: string
): boolean {
  for (const [key, totals] of monthlyNet) {
    if (key > monthKey && (totals.income !== 0 || totals.expense !== 0)) return true
  }

  return false
}

/**
 * The rebuilt month-end values of a past month, worked back from today. `null` for a month before
 * the first income or expense record, where the wallet cannot be told from the opening balance.
 */
export function rebuiltMonthEnd(
  input: NetWorthRebuildInput,
  monthKey: string,
  config: NetAvailableConfig
): Pick<NetWorthSnapshot, 'netWorth' | 'assets' | 'liabilities'> | null {
  const first = earliestNetMonth(input.monthlyNet)

  if (!first || monthKey < first) return null

  return rebuildMonthValues(input, monthKey, config)
}

/**
 * A reader of «دارایی قابل اتکا» at the end of any past month, worked back from today for reports
 * that have no stored snapshot (nothing is written anywhere). It is an estimate, and it is blind to
 * whatever is not an income or expense record: vault buys and sells, goal transfers, manual balance
 * edits and bank-SMS balance overwrites move the wallet without a record, while a record without an
 * account counts as income or expense although it never touched the wallet. `null` for a month
 * before the first record, where the wallet cannot be told from the opening balance.
 */
export function monthEndNetWorthReader(
  input: NetWorthRebuildInput,
  config: NetAvailableConfig
): (monthKey: string) => number | null {
  return monthKey => rebuiltMonthEnd(input, monthKey, config)?.netWorth ?? null
}
