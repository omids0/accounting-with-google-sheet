import { lazy, Suspense, useState } from 'react'

import ChartsCategoriesBlock from './ChartsCategoriesBlock'
import ChartsPeriodBar, { formatChartsPeriod } from './ChartsPeriodBar'
import MonthlyNetBars from './MonthlyNetBars'
import { useChartsPage } from './useChartsPage'
import { CHARTS_TREND_MONTHS } from '../../services/chartsData'
import { isConfigured } from '../../services/settings'
import { formatPersianNumber } from '../../utils/formatMoney'
import CalmBlock from '../CalmBlock'
import EmptyState from '../EmptyState'
import { Skeleton } from '../skeleton'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { calmChartFlatClass, calmSegmentClass } from '../ui/calmListStyles'
import { dashboardCalmPageClass } from '../ui/dashboardCalmStyles'

const LazyIncomeExpenseMonthlyChart = lazy(() => import('../charts/IncomeExpenseMonthlyChart'))

const LazyNetWorthTrendView = lazy(() => import('../netWorth/NetWorthTrendView'))

type ChartsSection = 'categories' | 'flow' | 'netWorth'

const SECTION_OPTIONS: { id: ChartsSection; label: string }[] = [
  { id: 'categories', label: 'دسته‌ها' },
  { id: 'flow', label: 'درآمد و هزینه' },
  { id: 'netWorth', label: 'دارایی خالص' }
]

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

/**
 * «نمودارها» in three segments: categories, income vs expense with the monthly
 * net (for a month or a year), and the 12-month net-worth trend.
 */
export default function ChartsPage() {
  const { period, setPeriod, setMode, data, loading } = useChartsPage()
  const [section, setSection] = useState<ChartsSection>('categories')

  if (!isConfigured()) {
    return <EmptyState icon="chart" message="ابتدا با گوگل وارد شوید" />
  }

  const span =
    period.mode === 'year'
      ? `سال ${formatChartsPeriod(period)}`
      : `${formatPersianNumber(CHARTS_TREND_MONTHS)} ماه`

  return (
    <div className={dashboardCalmPageClass} aria-busy={section !== 'netWorth' && loading}>
      <TransactionTypeSegment
        className={calmSegmentClass}
        options={SECTION_OPTIONS}
        value={section}
        onChange={id => setSection(id as ChartsSection)}
        ariaLabel="بخش نمودارها"
      />

      {section === 'netWorth' ? (
        <Suspense fallback={<BlockSkeleton title="۱۲ ماه اخیر" />}>
          <LazyNetWorthTrendView />
        </Suspense>
      ) : (
        <>
          <ChartsPeriodBar period={period} onModeChange={setMode} onPeriodChange={setPeriod} />

          {section === 'categories' ? (
            data ? (
              <ChartsCategoriesBlock data={data} />
            ) : (
              <BlockSkeleton title="دسته‌ها" rows={4} />
            )
          ) : !data ? (
            <>
              <BlockSkeleton title={`درآمد در برابر هزینه · ${span}`} />
              <BlockSkeleton title={`خالص ماهانه · ${span}`} />
            </>
          ) : (
            <>
              <CalmBlock title={`درآمد در برابر هزینه · ${span}`}>
                <Suspense fallback={<div className="min-h-40" />}>
                  <LazyIncomeExpenseMonthlyChart data={data.flow} className={calmChartFlatClass} />
                </Suspense>
              </CalmBlock>

              <CalmBlock title={`خالص ماهانه · ${span}`}>
                <MonthlyNetBars flow={data.flow} />
              </CalmBlock>
            </>
          )}
        </>
      )}
    </div>
  )
}
