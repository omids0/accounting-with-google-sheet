import { useState } from 'react'

import ForecastAccountsCard from './ForecastAccountsCard'
import ForecastAssumptions from './ForecastAssumptions'
import ForecastChart from './ForecastChart'
import ForecastDayGrid from './ForecastDayGrid'
import { VIEW_OPTIONS } from './forecastLabels'
import ForecastPurchaseCard from './ForecastPurchaseCard'
import ForecastSpendingControl from './ForecastSpendingControl'
import ForecastSummary from './ForecastSummary'
import { useCashForecast, type ForecastViewId } from './useCashForecast'
import { isConfigured } from '../../services/settings'
import { cn } from '../../utils/cn'
import CalmBlock from '../CalmBlock'
import EmptyState from '../EmptyState'
import { ReportStaticMetaBar } from '../reports/ReportDateFilterBar'
import { InstallmentCardListSkeleton } from '../skeleton'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { calmSegmentClass } from '../ui/calmListStyles'
import { dashboardPageClass } from '../ui/chartStyles'
import { reportPageClass } from '../ui/toolsPageStyles'

/**
 * «تا آخر ماه چقدر می‌ماند؟»: the estimated balance of the chosen wallet accounts, day by day,
 * from today's balances and the known upcoming money; plus «می‌توانم بخرم؟». It only reads: no
 * sheet is written, and every figure on it is an estimate and says so.
 */
export default function CashForecastPage() {
  const forecast = useCashForecast()
  const { data, computed, loading } = forecast
  const [picked, setPicked] = useState('')

  if (!isConfigured()) {
    return <EmptyState icon="dashboard" message="ابتدا با گوگل وارد شوید" />
  }

  if (!data || !computed) {
    return loading ? (
      <InstallmentCardListSkeleton count={4} />
    ) : (
      <EmptyState icon="wallet" message="برآورد بارگذاری نشد؛ دوباره تلاش کن" />
    )
  }

  if (!data.accounts.length) {
    return (
      <EmptyState
        icon="wallet"
        message="برای برآورد، یک حساب در کیف پول لازم است"
        description="موجودی حساب‌ها نقطهٔ شروع برآورد است."
      />
    )
  }

  const { forecast: result, purchase, slider, leftOut, events } = computed
  const selectedDay = result.days.some(day => day.date === picked) ? picked : result.lowest.date

  return (
    <div className={cn(dashboardPageClass, reportPageClass)}>
      <ReportStaticMetaBar
        subtitle="همهٔ عددهای این صفحه برآورد است، نه موجودی واقعی"
        onRefresh={forecast.reload}
        loading={loading}
      />

      <ForecastAccountsCard
        accounts={data.accounts}
        excluded={forecast.excluded}
        included={result.included}
        startBalance={result.startBalance}
        onToggle={forecast.toggleAccount}
      />

      <TransactionTypeSegment
        className={calmSegmentClass}
        options={VIEW_OPTIONS}
        value={forecast.view}
        onChange={id => forecast.setView(id as ForecastViewId)}
        ariaLabel="بازهٔ برآورد"
      />

      <ForecastSummary
        forecast={result}
        view={forecast.view}
        endIso={forecast.endIso}
        dailySpending={forecast.dailySpending}
        historyEnough={data.spending.enough}
      />

      <CalmBlock title="مانده برآوردی روز به روز">
        <ForecastChart days={result.days} safeMargin={result.safeMargin} lowest={result.lowest} />
        {forecast.view === '60' ? (
          <p className="mt-2 mb-0 text-[0.76rem] text-warning">
            برآورد ۶۰ روزه دقت کمی دارد؛ هرچه دورتر، حدس بیشتر.
          </p>
        ) : null}
      </CalmBlock>

      <ForecastSpendingControl
        value={forecast.dailySpending}
        max={slider.max}
        step={slider.step}
        onChange={forecast.setDailySpending}
        average={forecast.spendingAverage}
        onUseAverage={forecast.useAverageSpending}
        lateChecks={forecast.lateChecks}
        onLateChecksChange={forecast.setLateChecks}
      />

      <ForecastDayGrid days={result.days} selected={selectedDay} onSelect={setPicked} />

      <ForecastPurchaseCard
        amount={forecast.purchaseAmount}
        date={forecast.purchaseDate}
        result={purchase}
        onAmountChange={forecast.setPurchaseAmount}
        onDateChange={forecast.setPurchaseDate}
      />

      <ForecastAssumptions
        forecast={result}
        events={events}
        leftOut={leftOut}
        dailySpending={forecast.dailySpending}
        spending={data.spending}
        failed={data.failed}
      />
    </div>
  )
}
