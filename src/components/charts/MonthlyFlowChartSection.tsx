import { lazy, Suspense, type ReactNode } from 'react'

import type { MonthlyChartLabels } from './IncomeExpenseMonthlyChart'
import type { MonthlyFlow } from '../../types'
import DeferredMount from '../DeferredMount'
import { ChartCardSkeleton } from '../skeleton'

const LazyIncomeExpenseMonthlyChart = lazy(() => import('./IncomeExpenseMonthlyChart'))

interface MonthlyFlowChartSectionProps {
  data: MonthlyFlow[]
  header?: ReactNode
  labels?: MonthlyChartLabels
}

export default function MonthlyFlowChartSection({
  data,
  header,
  labels
}: MonthlyFlowChartSectionProps) {
  // ~4rem per month with activity (name row + two bars); holds the chart's place until it arrives.
  const months = data.filter(item => item.income !== 0 || item.expense !== 0).length
  const placeholder = (
    <ChartCardSkeleton height={Math.max(1, months) * 64} hideTitle>
      {header}
    </ChartCardSkeleton>
  )

  return (
    <DeferredMount fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <LazyIncomeExpenseMonthlyChart data={data} header={header} labels={labels} />
      </Suspense>
    </DeferredMount>
  )
}
