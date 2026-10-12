import { lazy, Suspense, useMemo, useState } from 'react'

import { useCategoryBudgets } from '../../hooks/useCategoryBudgets'
import { useChartTheme } from '../../hooks/useChartTheme'
import type { ChartsData } from '../../services/chartsData'
import { compareCategories } from '../../services/monthComparison'
import { cn } from '../../utils/cn'
import { formatPersianNumber } from '../../utils/formatMoney'
import BudgetSheet from '../budgets/BudgetSheet'
import CalmBlock from '../CalmBlock'
import type { CategoryInsights } from '../charts/CategoryRowInsights'
import CategoryShareList from '../charts/CategoryShareList'
import { CATEGORY_TONE_OPTIONS, type CategoryTone } from '../charts/categoryTone'
import { donutSliceColorIndex } from '../charts/chartUtils'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { calmChartFlatClass, calmEmptyClass, calmSegmentClass } from '../ui/calmListStyles'

const LazyCategoryDonutChart = lazy(() => import('../charts/CategoryDonutChart'))

const DONUT_MAX_SLICES = 6

/** «دسته‌ها»: هزینه | درآمد, one donut with the total in its center and the full category list. */
export default function ChartsCategoriesBlock({ data }: { data: ChartsData }) {
  const [tone, setTone] = useState<CategoryTone>('expense')
  const theme = useChartTheme()
  const isMonth = data.previousMonth != null
  const { budgets, editing, openBudget, closeBudget } = useCategoryBudgets(isMonth)

  const items = tone === 'expense' ? data.expenseByCategory : data.incomeByCategory
  const palette = tone === 'expense' ? theme.expensePalette : theme.incomePalette
  const colors = items.map(
    (_, index) =>
      palette[donutSliceColorIndex(index, items.length, DONUT_MAX_SLICES) % palette.length]
  )

  // Month view only (data.previousMonth is set): budgets on expense rows, comparison on all.
  const insights = useMemo<CategoryInsights | undefined>(() => {
    if (!data.previousMonth) return undefined

    const previous =
      tone === 'expense'
        ? data.previousMonth.expenseByCategory
        : data.previousMonth.incomeByCategory

    return {
      comparisons: compareCategories(items, previous),
      previousMonthName: data.previousMonth.monthName,
      ...(tone === 'expense' ? { budgets, onBudget: openBudget } : {})
    }
  }, [data.previousMonth, tone, items, budgets, openBudget])

  return (
    <CalmBlock
      title="دسته‌ها"
      toolbar={
        <div className="mb-1 flex items-center justify-between gap-2">
          <TransactionTypeSegment
            className={calmSegmentClass}
            options={CATEGORY_TONE_OPTIONS}
            value={tone}
            onChange={id => setTone(id as CategoryTone)}
            ariaLabel="نوع دسته‌ها"
          />
          <span className="truncate font-numeric text-[0.72rem] text-muted" title="هزینه / درآمد">
            {`${formatPersianNumber(data.totalExpense)} / ${formatPersianNumber(data.totalIncome)}`}
          </span>
        </div>
      }
    >
      {!items.length ? (
        <p className={calmEmptyClass}>
          {tone === 'expense' ? 'هزینه‌ای در این بازه نیست' : 'درآمدی در این بازه نیست'}
        </p>
      ) : (
        <>
          <Suspense fallback={<div className="min-h-[168px]" />}>
            <LazyCategoryDonutChart
              data={items}
              tone={tone}
              maxSlices={DONUT_MAX_SLICES}
              showLegend={false}
              centerLabel={tone === 'expense' ? 'جمع هزینه' : 'جمع درآمد'}
              className={cn(calmChartFlatClass)}
            />
          </Suspense>
          <CategoryShareList
            items={items}
            tone={tone}
            variant="dot"
            colors={colors}
            insights={insights}
          />
        </>
      )}
      <BudgetSheet category={editing} onClose={closeBudget} />
    </CalmBlock>
  )
}
