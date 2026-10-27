import type { VaultAssetClass } from './entities'
import type { PreviousMonthSummary } from './insights'

export interface CategorySummary {
  name: string
  total: number
}

/** A category total with its share of all categories of that type (0–1). */
export interface CategoryShare extends CategorySummary {
  share: number
}

/** One point of a month-by-month series (trend line, net bars). */
export interface MonthlyPoint {
  monthKey: string
  label: string
  value: number
}

export interface MonthlyFlow {
  monthKey: string
  label: string
  income: number
  expense: number
  net: number
}

export interface DashboardRecord {
  /** Row id, to open the record's detail sheet. */
  id?: string
  formName: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  /** Title of the wallet account the record names, if any. */
  account?: string
  /** Email in «ثبت‌کننده» (shared spreadsheets show an avatar). */
  writer?: string
}

export interface FinancialSummary {
  /** The wallet the assets count: today's, or its balance at the end of a period that has ended. */
  walletTotal: number
  /** The wallet balance today; equals `walletTotal` unless the period ended in the past. */
  walletTotalNow?: number
  /** ISO day `walletTotal` refers to when the period ended before today; absent otherwise. */
  walletAsOf?: string
  treasuryTotal: number
  /** Vault value per asset class (classes with holdings); sums to `treasuryTotal`. */
  treasuryByClass?: { assetClass: VaultAssetClass; label: string; total: number }[]
  /** Savings goal balances, already inside `treasuryTotal`. */
  goalsTotal?: number
  receivablesTotal: number
  totalAssets: number
  installmentsDue: number
  dangsTotal: number
  /** Unpaid payable checks due in the period. */
  checksDue: number
  /** Unpaid received checks due in the period; older summaries lack it. */
  checksReceivable?: number
  totalLiabilities: number
  netAvailable: number
}

export type DashboardNavTarget =
  | 'wallet'
  | 'treasury'
  | 'receivables'
  | 'installments'
  | 'dang'
  | 'checks'

export interface DashboardData {
  totalIncome: number
  totalExpense: number
  balance: number
  openingBalance: number
  periodBalance: number
  reconciliationDiff: number
  monthKey: string
  monthLabel: string
  financial: FinancialSummary
  incomeByCategory: CategorySummary[]
  expenseByCategory: CategorySummary[]
  /** The month before the period starts, for «↑ ۳۰٪ از شهریور» (shown for month periods). */
  previousMonth?: PreviousMonthSummary
  yearlyMonthlyFlow: MonthlyFlow[]
  recentRecords: DashboardRecord[]
}
