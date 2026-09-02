export interface CategorySummary {
  name: string
  total: number
}

export interface MonthlyFlow {
  monthKey: string
  label: string
  income: number
  expense: number
  net: number
}

export interface DashboardRecord {
  formName: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

export interface FinancialSummary {
  walletTotal: number
  treasuryTotal: number
  receivablesTotal: number
  totalAssets: number
  installmentsDue: number
  dangsTotal: number
  checksDue: number
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
  yearlyMonthlyFlow: MonthlyFlow[]
  recentRecords: DashboardRecord[]
}
