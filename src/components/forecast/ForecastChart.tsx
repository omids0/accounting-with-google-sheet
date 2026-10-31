import { forecastDayLabel } from './forecastLabels'
import { useIsAmountsHidden } from '../../hooks/useAmountsHidden'
import type { ForecastDay } from '../../services/cashForecast'
import { maskedText } from '../../utils/amountMask'
import { formatCompactNumber, formatMoney } from '../../utils/formatMoney'

const PLOT_HEIGHT = 'h-44'

/** Money as a short axis label, with a real minus for negatives («−۳٫۵ م»). */
function axisText(value: number): string {
  if (value === 0) return '۰'

  return formatCompactNumber(value)
}

/**
 * Estimated balance day by day, today on the right (reading direction). A money axis (top, zero,
 * bottom) sits at the start edge; the band under the safe margin is amber and below zero red.
 * The line is drawn in a stretched 0–100 box, the marker and the axis in HTML so their text keeps
 * its real size. Every day is also a button in the calendar below, so the chart itself is a
 * labelled picture.
 */
export default function ForecastChart({
  days,
  safeMargin,
  lowest
}: {
  days: ForecastDay[]
  safeMargin: number
  lowest: { date: string; balance: number }
}) {
  const hidden = useIsAmountsHidden()
  const balances = days.map(day => day.balance)
  const top = Math.max(0, safeMargin, ...balances)
  const bottom = Math.min(0, ...balances)
  const span = top - bottom || 1
  const y = (value: number) => 4 + ((top - value) / span) * 92
  const x = (index: number) => (days.length > 1 ? 100 - (index / (days.length - 1)) * 100 : 50)
  const points = days.map((day, index) => `${x(index)},${y(day.balance)}`).join(' ')
  const lowestIndex = Math.max(
    0,
    days.findIndex(day => day.date === lowest.date)
  )
  const first = days[0]
  const last = days[days.length - 1]

  const label = maskedText(
    hidden,
    `نمودار برآورد مانده از ${forecastDayLabel(first.date)} تا ${forecastDayLabel(
      last.date
    )}؛ پایین‌ترین مانده برآوردی ${formatMoney(lowest.balance)} در ${forecastDayLabel(lowest.date)}`
  )

  return (
    <figure className="m-0 flex flex-col gap-1">
      <div className={`flex gap-1 ${PLOT_HEIGHT}`}>
        <div
          className="relative w-11 shrink-0 text-[0.72rem] font-numeric tabular-nums text-muted"
          aria-hidden="true"
        >
          {[top, 0, bottom]
            .filter((value, index, all) => all.indexOf(value) === index)
            .map(value => (
              <span
                key={value}
                className="absolute end-0 -translate-y-1/2 whitespace-nowrap"
                style={{ top: `${y(value)}%` }}
              >
                <bdi>{hidden ? '•••' : axisText(value)}</bdi>
              </span>
            ))}
        </div>

        <div className="relative min-w-0 flex-1" role="img" aria-label={label}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <rect
              x="0"
              y={y(safeMargin)}
              width="100"
              height={Math.max(y(0) - y(safeMargin), 0)}
              fill="var(--color-warning-bg)"
            />
            <rect x="0" y={y(0)} width="100" height={100 - y(0)} fill="var(--color-danger-bg)" />
            <line
              x1="0"
              x2="100"
              y1={y(0)}
              y2={y(0)}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={points}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            aria-hidden="true"
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-danger"
            style={{ left: `${x(lowestIndex)}%`, top: `${y(lowest.balance)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between ps-12 text-[0.72rem] text-muted" aria-hidden="true">
        <span>
          امروز · <bdi>{forecastDayLabel(first.date)}</bdi>
        </span>
        <span>
          <bdi>{forecastDayLabel(last.date)}</bdi>
        </span>
      </div>

      <figcaption className="flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-muted">
        <span>
          <span
            aria-hidden="true"
            className="me-1 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--color-warning-bg)] align-middle ring-1 ring-[var(--color-warning-border)]"
          />
          زیر حاشیهٔ امن
        </span>
        <span>
          <span
            aria-hidden="true"
            className="me-1 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--color-danger-bg)] align-middle ring-1 ring-[var(--color-danger-border)]"
          />
          زیر صفر
        </span>
        <span>
          <span
            aria-hidden="true"
            className="me-1 inline-block h-2.5 w-2.5 rounded-full bg-danger align-middle"
          />
          پایین‌ترین روز
        </span>
      </figcaption>
    </figure>
  )
}
