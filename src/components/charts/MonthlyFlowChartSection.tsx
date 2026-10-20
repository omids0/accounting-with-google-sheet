import { lazy, Suspense, type ReactNode } from 'react'

import type { MonthlyChartLabels } from './IncomeExpenseMonthlyChart'
import type { MonthlyFlow } from '../../types'
import DeferredMount from '../DeferredMount'

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
  return (
    <DeferredMount>
      <Suspense fallback={null}>
        <LazyIncomeExpenseMonthlyChart data={data} header={header} labels={labels} />
      </Suspense>
    </DeferredMount>
  )
}
