import { memo, useEffect, useState } from 'react'

import { formatPersianPercent } from './chartUtils'
import { prefersReducedMotion } from '../../hooks/useChartTheme'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { chartCardClass, chartTitleClass } from '../ui/chartStyles'

interface CategoryBarChartProps {
  title: string
  data: { name: string; total: number }[]
  tone: 'income' | 'expense'
  className?: string
  /** Kept for callers that line several charts up; the list layout needs no axis width. */
  yAxisWidth?: number
}

const listClass = 'relative z-[1] m-0 flex list-none flex-col gap-3 p-0'

const rowHeadClass = 'mb-1.5 flex items-baseline justify-between gap-3'

const nameClass =
  'min-w-0 flex-1 truncate text-[0.82rem] font-semibold leading-snug text-[var(--color-text)]'

const amountClass =
  'shrink-0 whitespace-nowrap font-numeric text-[0.78rem] font-bold tabular-nums text-[var(--color-text)]'

const shareClass = 'ms-1.5 text-[0.7rem] font-semibold text-muted'

const trackClass =
  'h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-accent-soft)_70%,transparent)]'

const barClass =
  'h-full rounded-full origin-right transition-transform duration-700 ease-out motion-reduce:transition-none'

/**
 * Category totals as a list: name and amount on one line, a bar under it that
 * grows from the right. Unlike an SVG axis chart it never truncates names into
 * «خوراک و نوشید…», leaves no gap between a short label and its bar, and shows
 * the exact amount without needing a tooltip on a phone.
 */
function CategoryBarChart({ title, data, tone, className = '' }: CategoryBarChartProps) {
  const [grown, setGrown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (grown) return

    const frame = requestAnimationFrame(() => setGrown(true))

    return () => cancelAnimationFrame(frame)
  }, [grown])

  if (!data.length) return null

  const maxTotal = Math.max(...data.map(item => item.total), 1)
  const sum = data.reduce((acc, item) => acc + item.total, 0) || 1
  const barColor = tone === 'income' ? 'var(--color-income)' : 'var(--color-expense)'

  return (
    <div className={cn(chartCardClass, 'chart-card--animated', className)}>
      <h3 className={chartTitleClass}>{title}</h3>
      <ul className={listClass}>
        {data.map(item => {
          const ratio = item.total / maxTotal

          return (
            <li key={item.name}>
              <div className={rowHeadClass}>
                <span className={nameClass} title={item.name}>
                  {item.name}
                </span>
                <span className={amountClass}>
                  {formatMoney(item.total)}
                  <span className={shareClass}>
                    {formatPersianPercent((item.total / sum) * 100)}
                  </span>
                </span>
              </div>
              <div className={trackClass} aria-hidden="true">
                <div
                  className={barClass}
                  style={{
                    background: barColor,
                    // A visible sliver even for tiny shares, so every row has a bar.
                    transform: `scaleX(${grown ? Math.max(ratio, 0.015) : 0})`
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default memo(CategoryBarChart)
