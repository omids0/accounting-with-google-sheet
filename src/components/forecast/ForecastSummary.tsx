import { endLabel, forecastDayLabel } from './forecastLabels'
import type { ForecastViewId } from './useCashForecast'
import type { ForecastResult } from '../../services/cashForecast'
import { cn } from '../../utils/cn'
import CalmBlock from '../CalmBlock'
import ForecastMoney from './ForecastMoney'

const figureClass = 'min-w-0 rounded-xl border border-border bg-bg px-3 py-2'

const labelClass = 'block text-[0.72rem] text-muted'

const valueClass = 'mt-0.5 block font-numeric text-[1rem] font-extrabold tabular-nums'

const noteClass = 'mt-0.5 block text-[0.72rem] text-muted'

/**
 * The three numbers of the estimate: where the balance ends, how low it gets and the first day it
 * goes below zero. Each one says «برآورد»; none is worded as a fact.
 */
export default function ForecastSummary({
  forecast,
  view,
  endIso,
  dailySpending,
  historyEnough
}: {
  forecast: ForecastResult
  view: ForecastViewId
  endIso: string
  dailySpending: number
  /** Enough expense history for an average (under 14 days it is too little). */
  historyEnough: boolean
}) {
  const { endBalance, lowest, firstNegativeDate } = forecast
  const ending = endLabel(view, endIso)
  // With nothing spent per day the figures only hold the known due dates: say so beside them.
  const withoutSpending = dailySpending <= 0

  return (
    <CalmBlock title="خلاصهٔ برآورد" badge={<span className="text-muted">· همه برآورد است</span>}>
      {withoutSpending ? (
        <p className="m-0 mb-2 text-[0.76rem] leading-[1.8] text-warning">
          این عددها بدون خرج روزانه‌اند و فقط سررسیدهای ثبت‌شده را حساب کرده‌اند؛ پس خوش‌بینانه‌اند.{' '}
          {historyEnough ? '' : 'سابقهٔ کم؛ خرج روزانه را خودتان بگذارید.'}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <div className={cn(figureClass, 'min-[420px]:col-span-2')}>
          <span className={labelClass}>
            مانده برآوردی تا {ending}
            {withoutSpending ? ' (بدون خرج روزانه)' : ''}
          </span>
          <span className={cn(valueClass, endBalance < 0 ? 'text-danger' : 'text-text')}>
            حدود <ForecastMoney amount={endBalance} />
          </span>
          <span className={noteClass}>برآورد است، نه موجودی واقعی</span>
        </div>

        <div className={figureClass}>
          <span className={labelClass}>
            پایین‌ترین مانده برآوردی{withoutSpending ? ' (بدون خرج روزانه)' : ''}
          </span>
          <span className={cn(valueClass, lowest.balance < 0 ? 'text-danger' : 'text-text')}>
            <ForecastMoney amount={lowest.balance} />
          </span>
          <span className={noteClass}>
            در <bdi>{forecastDayLabel(lowest.date)}</bdi>
          </span>
        </div>

        <div className={figureClass}>
          <span className={labelClass}>اولین روز زیر صفر</span>
          {firstNegativeDate ? (
            <>
              <span className={cn(valueClass, 'text-danger')}>
                <bdi>{forecastDayLabel(firstNegativeDate)}</bdi>
              </span>
              <span className={noteClass}>در این برآورد مانده از این روز منفی می‌شود</span>
            </>
          ) : (
            <>
              <span className={valueClass}>ندارد</span>
              <span className={noteClass}>
                در این برآورد مانده منفی نمی‌شود{withoutSpending ? '، ولی بدون خرج روزانه' : ''}
              </span>
            </>
          )}
        </div>
      </div>
    </CalmBlock>
  )
}
