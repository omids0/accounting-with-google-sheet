import type { CategorySummary } from './dashboard'

/** `reached` once the balance hits the target; `archived` hides the goal from «همه». */
export type SavingsGoalStatus = 'active' | 'reached' | 'archived'

/** One row of «هدف_صندوقچه»; the balance is derived from «گردش حساب». */
export interface SavingsGoal {
  id: string
  createdAt: string
  title: string
  target: number
  /** ISO date; empty when the goal has no deadline. */
  targetDate: string
  /** Wallet account a deposit starts from. */
  defaultAccountId: string
  note: string
  status: SavingsGoalStatus
}

/** A goal with what its ledger rows add up to. */
export interface SavingsGoalView extends SavingsGoal {
  rowNumber: number
  balance: number
  /** Deposits (not withdrawals) dated in the current Jalali month. */
  monthDeposits: number
}

/** One row of «بودجه»: a monthly limit for an expense category. */
export interface CategoryBudget {
  category: string
  amount: number
  updatedAt: string
}

/** The month before the shown one, for «↑ ۳۰٪ از شهریور». */
export interface PreviousMonthSummary {
  /** Persian month name only («شهریور»). */
  monthName: string
  totalIncome: number
  totalExpense: number
  incomeByCategory: CategorySummary[]
  expenseByCategory: CategorySummary[]
}

export type MonthTrend = 'up' | 'down' | 'same'

export interface MonthComparison {
  trend: MonthTrend
  /** Whole percent of the change, always ≥ 0. */
  percent: number
}

/** «یادآوری + یک لمس» (a dashboard card) or «خودکار» (posted on app open). */
export type RecurringMode = 'reminder' | 'auto'

/** One row of «تکرارها»: a monthly income/expense posted from a template. */
export interface RecurringItem {
  id: string
  createdAt: string
  type: 'income' | 'expense'
  category: string
  subCategory: string
  /** Wallet account id ('' when none). */
  accountId: string
  amount: number
  title: string
  /** 1–31; clamped to the last day of shorter Jalali months. */
  dayOfMonth: number
  mode: RecurringMode
  /** Jalali `YYYY-MM` of the last month handled (posted or skipped); '' never. */
  lastPosted: string
  active: boolean
  /** Round 11, building expenses: a key of the managed kind list. */
  expenseKind?: string
  /** Round 11, building expenses: a key of the managed payer list ('' = the fund). */
  payer?: string
}
