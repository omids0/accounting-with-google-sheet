import { useMemo, useState } from 'react'

import { useCategoryBudgets } from '../../hooks/useCategoryBudgets'
import { compareCategories } from '../../services/monthComparison'
import type { CategorySummary, PreviousMonthSummary } from '../../types'
import { topCategoryShares } from '../../utils/categoryShares'
import { cn } from '../../utils/cn'
import BudgetSheet from '../budgets/BudgetSheet'
import CalmBlock from '../CalmBlock'
import type { CategoryInsights } from '../charts/CategoryRowInsights'
import CategoryShareList from '../charts/CategoryShareList'
import { CATEGORY_TONE_OPTIONS, type CategoryTone } from '../charts/categoryTone'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { calmEmptyClass, calmSegmentClass } from '../ui/calmListStyles'

/**
 * «تحلیل این ماه»: the top three expense (default) or income categories with a share
 * bar. For a month, expense rows measure against their budget and every row compares
 * with the month before («↑ ۳۰٪ از شهریور»).
 */
export default function DashboardAnalysisBlock({
  expenseByCategory,
  incomeByCategory,
  previousMonth,
  isMonth = false,
  onOpenCharts,
  periodNoun = 'ماه',
  className
}: {
  className?: string
  expenseByCategory: CategorySummary[]
  incomeByCategory: CategorySummary[]
  previousMonth?: PreviousMonthSummary
  /** Budgets and comparisons only make sense for a whole month. */
  isMonth?: boolean
  onOpenCharts: () => void
  periodNoun?: string
}) {
  const [tone, setTone] = useState<CategoryTone>('expense')
  const { budgets, editing, openBudget, closeBudget } = useCategoryBudgets(isMonth)

  const rows = useMemo(
    () => topCategoryShares(tone === 'expense' ? expenseByCategory : incomeByCategory, 3),
    [tone, expenseByCategory, incomeByCategory]
  )

  const insights = useMemo<CategoryInsights | undefined>(() => {
    if (!isMonth) return undefined

    const previous =
      tone === 'expense' ? previousMonth?.expenseByCategory : previousMonth?.incomeByCategory

    return {
      comparisons: compareCategories(rows, previous),
      previousMonthName: previousMonth?.monthName,
      ...(tone === 'expense' ? { budgets, onBudget: openBudget } : {})
    }
  }, [isMonth, tone, rows, previousMonth, budgets, openBudget])

  return (
    <CalmBlock
      className={className}
      title={`تحلیل این ${periodNoun}`}
      action={{ label: 'نمودارها ←', onClick: onOpenCharts }}
      toolbar={
        <TransactionTypeSegment
          className={cn(calmSegmentClass, 'mb-1 self-start')}
          options={CATEGORY_TONE_OPTIONS}
          value={tone}
          onChange={id => setTone(id as CategoryTone)}
          ariaLabel="نوع تحلیل"
        />
      }
    >
      {!rows.length ? (
        <p className={calmEmptyClass}>
          {tone === 'expense'
            ? `هزینه‌ای در این ${periodNoun} نیست`
            : `درآمدی در این ${periodNoun} نیست`}
        </p>
      ) : (
        <CategoryShareList items={rows} tone={tone} insights={insights} />
      )}
      <BudgetSheet category={editing} onClose={closeBudget} />
    </CalmBlock>
  )
}
