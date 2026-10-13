import { lazy, Suspense } from 'react'

import ChartsCategoriesBlock from './ChartsCategoriesBlock'
import ChartsPeriodBar, { formatChartsPeriod } from './ChartsPeriodBar'
import CumulativeNetChart from './CumulativeNetChart'
import MonthlyNetBars from './MonthlyNetBars'
import { useChartsPage } from './useChartsPage'
import { CHARTS_TREND_MONTHS } from '../../services/chartsData'
import { isConfigured } from '../../services/settings'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import EmptyState from '../EmptyState'
import { Skeleton } from '../skeleton'
import { calmChartFlatClass, calmNoteClass } from '../ui/calmListStyles'
import { dashboardCalmPageClass } from '../ui/dashboardCalmStyles'

const LazyIncomeExpenseMonthlyChart = lazy(() => import('../charts/IncomeExpenseMonthlyChart'))

function BlockSkeleton({ title, rows = 3 }: { title: string; rows?: number }) {
  return (
    <CalmBlock title={title}>
      <div className="flex flex-col gap-3 py-2" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} width={`${90 - index * 15}%`} height="0.9rem" />
        ))}
      </div>
    </CalmBlock>
  )
}

/** «نمودارها»: categories, income vs expense, cumulative net and monthly net for a month or year. */
export default function ChartsPage() {
  const { period, setPeriod, setMode, data, loading } = useChartsPage()

  if (!isConfigured()) {
    return <EmptyState icon="chart" message="ابتدا با گوگل وارد شوید" />
  }

  const span =
    period.mode === 'year'
      ? `سال ${formatChartsPeriod(period)}`
      : `${formatPersianNumber(CHARTS_TREND_MONTHS)} ماه`

  return (
    <div className={dashboardCalmPageClass} aria-busy={loading}>
      <ChartsPeriodBar period={period} onModeChange={setMode} onPeriodChange={setPeriod} />

      {!data ? (
        <>
          <BlockSkeleton title="دسته‌ها" rows={4} />
          <BlockSkeleton title={`درآمد در برابر هزینه · ${span}`} />
          <BlockSkeleton title={`خالص تجمعی · ${span}`} />
          <BlockSkeleton title={`خالص ماهانه · ${span}`} />
        </>
      ) : (
        <>
          <ChartsCategoriesBlock data={data} />

          <CalmBlock title={`درآمد در برابر هزینه · ${span}`}>
            <Suspense fallback={<div className="min-h-40" />}>
              <LazyIncomeExpenseMonthlyChart data={data.flow} className={calmChartFlatClass} />
            </Suspense>
          </CalmBlock>

          <CalmBlock title={`خالص تجمعی · ${span}`}>
            <CumulativeNetChart points={data.cumulative} />
            <p className={calmNoteClass}>
              جمع خالص ماه‌ها از ابتدای بازه. چون مقدار «دارایی قابل اتکا» در ماه‌های گذشته ذخیره
              نمی‌شود، روند آن با همین خط تجمعی نشان داده می‌شود.
            </p>
          </CalmBlock>

          <CalmBlock title={`خالص ماهانه · ${span}`}>
            <MonthlyNetBars flow={data.flow} />
          </CalmBlock>
        </>
      )}
    </div>
  )
}
