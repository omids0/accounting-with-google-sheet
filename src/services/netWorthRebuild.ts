import { checksOfDirection } from './checkDirection'
import { applyNetAvailableConfig } from './dashboardNetAvailable'
import { totalInstallmentsInRange } from './installmentsCalculations'
import type { NetWorthSnapshot } from './netWorth'
import type { MonthlyNetTotals } from './openingBalanceDerive'
import { computeHoldings } from './treasuryHoldings'
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

/** Wallet at the end of `monthKey`: today's balance minus the net of every later month. */
function walletAt(input: NetWorthRebuildInput, monthKey: string): number {
  let later = 0

  for (const [key, totals] of input.monthlyNet) {
    if (key > monthKey) later += totals.income - totals.expense
  }

  return input.walletTotal - later
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

function openAt(check: Check, endIso: string): boolean {
  if (!check.paid) return true

  // «۱۴۰۵/۷/۲۳، ۱۰:۴۰:۱۲»: the day is what comes before the time.
  const paidOn = normalizeSheetDate(check.paidAt.split(/[،,\s]/)[0])

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
 * installments/checks due in that month; debts dated by then that are unpaid today.
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
      walletTotal: walletAt(input, monthKey),
      treasuryTotal: vault + input.goalsTotal,
      goalsTotal: input.goalsTotal,
      receivablesTotal: receivablesAt(input.receivables, range.end),
      installmentsDue: totalInstallmentsInRange(input.installmentPlans, range),
      checksDue: checksDueIn(input.checks, range, 'paid'),
      checksReceivable: checksDueIn(input.checks, range, 'received'),
      dangsTotal: input.dangs
        .filter(item => !item.paid && isOnOrBefore(item.date, range.end))
        .reduce((sum, item) => sum + item.amount, 0)
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
