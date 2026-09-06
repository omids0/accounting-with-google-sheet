import { lazy, Suspense } from 'react'

import type { CategorySummary } from '../../types'
import DeferredMount from '../DeferredMount'
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
  return (
    <DeferredMount>
      <Suspense fallback={null}>
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
