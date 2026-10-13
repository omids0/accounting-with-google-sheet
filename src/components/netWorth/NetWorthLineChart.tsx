import { useRef, type KeyboardEvent } from 'react'

import { netWorthMonthName, netWorthMonthTitle } from './netWorthLabels'
import { useIsAmountsHidden } from '../../hooks/useAmountsHidden'
import type { NetWorthPoint } from '../../services/netWorthTrend'
import { maskedText } from '../../utils/amountMask'
import { formatCompactNumber } from '../../utils/formatMoney'
import { LINE_CHART_BOX, lineChartLayout, polylinePoints } from '../charts/lineChartLayout'

const { width: WIDTH, height: HEIGHT, padX: PAD_X } = LINE_CHART_BOX

const pointButtonClass =
  'focus-ring-inset absolute inset-y-0 cursor-pointer rounded-md border-0 bg-transparent p-0'

/**
 * «۱۲ ماه اخیر»: net worth (solid) and selected liabilities (dashed red) on one
 * scale, oldest month on the right. Each month is a button (tap, hover, focus or
 * arrow keys) that selects it; hidden mode keeps the lines and drops the values.
 */
export default function NetWorthLineChart({
  points,
  selected,
  onSelect
}: {
  points: NetWorthPoint[]
  selected: string
  onSelect: (monthKey: string) => void
}) {
  const hidden = useIsAmountsHidden()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  // Oldest first in `points`; the layout puts index 0 on the right.
  const {
    series: [net, debt],
    xs,
    zeroY
  } = lineChartLayout([points.map(point => point.netWorth), points.map(point => point.liabilities)])
  const label = (point: NetWorthPoint) =>
    `${netWorthMonthTitle(point.monthKey)}: دارایی خالص ${maskedText(
      hidden,
      formatCompactNumber(point.netWorth)
    )}، بدهی‌ها ${maskedText(hidden, formatCompactNumber(point.liabilities))}`

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    // Right is older on this chart, as in the reading direction.
    const delta = event.key === 'ArrowRight' ? -1 : event.key === 'ArrowLeft' ? 1 : 0
    const next = points[index + delta]

    if (!delta || !next) return
    event.preventDefault()
    onSelect(next.monthKey)
    buttons.current[index + delta]?.focus()
  }

  const axis = [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]]

  return (
    <figure className="m-0">
      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full" aria-hidden="true">
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
          <polyline
            points={polylinePoints(debt)}
            fill="none"
            stroke="var(--color-expense)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <polyline
            points={polylinePoints(net)}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {net.map(({ x, y }, index) => {
            const on = points[index].monthKey === selected

            return (
              <circle
                key={points[index].monthKey}
                cx={x}
                cy={y}
                r={on ? 4.5 : 2.5}
                fill={on ? 'var(--color-surface)' : 'var(--color-primary)'}
                stroke="var(--color-primary)"
                strokeWidth={on ? 2.5 : 0}
              />
            )
          })}
        </svg>
        <div role="group" aria-label="ماه‌های نمودار دارایی خالص">
          {points.map((point, index) => (
            <button
              key={point.monthKey}
              ref={element => {
                buttons.current[index] = element
              }}
              type="button"
              className={pointButtonClass}
              style={{
                left: `${(xs[index] / WIDTH) * 100}%`,
                width: `${100 / Math.max(points.length, 1)}%`,
                transform: 'translateX(-50%)'
              }}
              aria-label={label(point)}
              aria-pressed={point.monthKey === selected}
              onClick={() => onSelect(point.monthKey)}
              onMouseEnter={() => onSelect(point.monthKey)}
              onFocus={() => onSelect(point.monthKey)}
              onKeyDown={event => onKeyDown(event, index)}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[0.66rem] text-muted" aria-hidden="true">
        {axis.map((point, index) => (
          <span key={`${point.monthKey}-${index}`}>
            {index === 1 ? netWorthMonthName(point.monthKey) : netWorthMonthTitle(point.monthKey)}
          </span>
        ))}
      </div>
    </figure>
  )
}
