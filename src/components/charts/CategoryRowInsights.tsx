import type { MonthComparison } from '../../types'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import { budgetLineText, categoryComparisonText, comparisonSentence } from '../../utils/insightText'
import {
  calmBudgetLinkClass,
  calmCompareClass,
  calmCompareToneClass,
  calmRowSubClass,
  calmRowSubDangerClass
} from '../ui/calmListStyles'

/** Budgets, last-month comparison and the budget sheet opener for category rows. */
export interface CategoryInsights {
  /** Category → monthly budget; set only where budgets apply (expense, month view). */
  budgets?: Map<string, number>
  onBudget?: (category: string) => void
  comparisons?: Map<string, MonthComparison>
  /** «شهریور». */
  previousMonthName?: string
}

/** «↑ ۳۰٪ از شهریور»: red when spending grows (green for income), grey when about equal. */
export function ComparisonBadge({
  comparison,
  monthName,
  tone
}: {
  comparison: MonthComparison
  monthName: string
  tone: 'income' | 'expense'
}) {
  const grows = comparison.trend === 'up'
  const toneKey =
    comparison.trend === 'same' ? 'same' : grows === (tone === 'expense') ? 'bad' : 'good'

  return (
    <span
      className={cn(calmCompareClass, calmCompareToneClass[toneKey])}
      title={comparisonSentence(comparison, monthName)}
    >
      <span aria-hidden="true">{categoryComparisonText(comparison, monthName)}</span>
      <span className="sr-only">{comparisonSentence(comparison, monthName)}</span>
    </span>
  )
}

/** «۸۹۰٬۰۰۰ از بودجه ۸۰۰٬۰۰۰ · ۹۰ هزار بیشتر», or «۱۲۰٬۰۰۰ · بدون بودجه · تعیین بودجه». */
export function BudgetLine({ spent, budget }: { spent: number; budget: number | undefined }) {
  if (budget) {
    return (
      <span className={cn(calmRowSubClass, spent > budget && calmRowSubDangerClass)}>
        {budgetLineText(spent, budget)}
      </span>
    )
  }

  return (
    <span className={calmRowSubClass}>
      {`${formatPersianNumber(spent)} · بدون بودجه · `}
      <span className={calmBudgetLinkClass}>تعیین بودجه</span>
    </span>
  )
}
