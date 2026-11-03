import { lazy, Suspense } from 'react'

import type { CategorySummary } from '../../types'
import DeferredMount from '../DeferredMount'
import { ChartCardSkeleton } from '../skeleton'
import { reportChartsGridClass } from '../ui/toolsPageStyles'

const LazyCategoryDonutChart = lazy(() => import('./CategoryDonutChart'))
const LazyCategoryBarChart = lazy(() => import('./CategoryBarChart'))

interface ReportCategoryChartsSectionProps {
  expenseByCategory: CategorySummary[]
  incomeByCategory: CategorySummary[]
  categoryYAxisWidth: number
}

export default function ReportCategoryChartsSection({
  expenseByCategory,
  incomeByCategory,
  categoryYAxisWidth
}: ReportCategoryChartsSectionProps) {
  // Donut + bar chart per side; the skeleton holds their place so the page does not jump.
  const chartCount = (expenseByCategory.length > 0 ? 2 : 0) + (incomeByCategory.length > 0 ? 2 : 0)
  const placeholder = (
    <div className={reportChartsGridClass}>
      {Array.from({ length: chartCount }, (_, index) => (
        <ChartCardSkeleton key={index} height={index % 2 === 0 ? 168 : 220} />
      ))}
    </div>
  )

  return (
    <DeferredMount fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <div className={reportChartsGridClass}>
          {expenseByCategory.length > 0 && (
            <>
              <LazyCategoryDonutChart
                title="سهم هزینه‌ها"
                data={expenseByCategory}
                tone="expense"
              />
              <LazyCategoryBarChart
                title="هزینه بر اساس دسته‌بندی"
                data={expenseByCategory}
                tone="expense"
                yAxisWidth={categoryYAxisWidth}
              />
            </>
          )}

          {incomeByCategory.length > 0 && (
            <>
              <LazyCategoryDonutChart title="سهم درآمدها" data={incomeByCategory} tone="income" />
              <LazyCategoryBarChart
                title="درآمد بر اساس دسته‌بندی"
                data={incomeByCategory}
                tone="income"
                yAxisWidth={categoryYAxisWidth}
              />
            </>
          )}
        </div>
      </Suspense>
    </DeferredMount>
  )
}
