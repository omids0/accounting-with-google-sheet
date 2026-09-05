import { lazy, Suspense, type ReactNode } from 'react'

import type { MonthlyFlow } from '../../types'
import DeferredMount from '../DeferredMount'

const LazyIncomeExpenseMonthlyChart = lazy(() => import('./IncomeExpenseMonthlyChart'))

interface MonthlyFlowChartSectionProps {
  data: MonthlyFlow[]
  header?: ReactNode
}

export default function MonthlyFlowChartSection({ data, header }: MonthlyFlowChartSectionProps) {
  return (
    <DeferredMount>
      <Suspense fallback={null}>
        <LazyIncomeExpenseMonthlyChart data={data} header={header} />
      </Suspense>
    </DeferredMount>
  )
}
