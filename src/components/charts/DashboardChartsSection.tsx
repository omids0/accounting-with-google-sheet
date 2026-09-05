import { lazy, Suspense, type ReactNode } from 'react'

import type { CategorySummary, MonthlyFlow } from '../../types'
import DeferredMount from '../DeferredMount'
import { chartTitleClass } from '../ui/chartStyles'
import { cardHeaderRowClass } from '../ui/recordsStyles'
import YearFilter from '../YearFilter'

const LazyCategoryDonutChart = lazy(() => import('./CategoryDonutChart'))
const LazyCategoryBarChart = lazy(() => import('./CategoryBarChart'))
const LazyIncomeExpenseMonthlyChart = lazy(() => import('./IncomeExpenseMonthlyChart'))

interface DashboardChartsSectionProps {
  expenseByCategory: CategorySummary[]
  incomeByCategory: CategorySummary[]
  categoryYAxisWidth: number
  yearlyMonthlyFlow: MonthlyFlow[]
  monthlyFlowYear: number
  setMonthlyFlowYear: (year: number) => void
  loading: boolean
}

export default function DashboardChartsSection({
  expenseByCategory,
  incomeByCategory,
  categoryYAxisWidth,
  yearlyMonthlyFlow,
  monthlyFlowYear,
  setMonthlyFlowYear,
  loading
}: DashboardChartsSectionProps) {
  const monthlyHeader: ReactNode = (
    <YearFilter year={monthlyFlowYear} onChange={setMonthlyFlowYear} loading={loading}>
      {({ trigger, panel }) => (
        <>
          <div className={cardHeaderRowClass}>
            <h3 className={chartTitleClass}>درآمد و هزینه ماهانه</h3>
            {trigger}
          </div>
          {panel}
        </>
      )}
    </YearFilter>
  )

  return (
    <DeferredMount>
      <Suspense fallback={null}>
        {expenseByCategory.length > 0 && (
          <>
            <LazyCategoryDonutChart title="سهم هزینه‌ها" data={expenseByCategory} tone="expense" />
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

        <LazyIncomeExpenseMonthlyChart data={yearlyMonthlyFlow} header={monthlyHeader} />
      </Suspense>
    </DeferredMount>
  )
}
