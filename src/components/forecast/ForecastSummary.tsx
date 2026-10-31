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
  endIso
}: {
  forecast: ForecastResult
  view: ForecastViewId
  endIso: string
}) {
  const { endBalance, lowest, firstNegativeDate } = forecast
  const ending = endLabel(view, endIso)

  return (
    <CalmBlock title="خلاصهٔ برآورد" badge={<span className="text-muted">· همه برآورد است</span>}>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <div className={cn(figureClass, 'min-[420px]:col-span-2')}>
          <span className={labelClass}>مانده برآوردی تا {ending}</span>
          <span className={cn(valueClass, endBalance < 0 ? 'text-danger' : 'text-text')}>
            حدود <ForecastMoney amount={endBalance} />
          </span>
          <span className={noteClass}>برآورد است، نه موجودی واقعی</span>
        </div>

        <div className={figureClass}>
          <span className={labelClass}>پایین‌ترین مانده برآوردی</span>
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
              <span className={noteClass}>در این برآورد مانده منفی نمی‌شود</span>
            </>
          )}
        </div>
      </div>
    </CalmBlock>
  )
}
