import { useEffect, useState } from 'react'

import { formatPersianPercent } from './chartUtils'
import { prefersReducedMotion } from '../../hooks/useChartTheme'
import type { CategoryShare } from '../../types'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import {
  calmBarClass,
  calmBarTrackClass,
  calmDotClass,
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

interface CategoryShareListProps {
  items: CategoryShare[]
  tone: 'income' | 'expense'
  /**
   * `bar`: a thin share-of-total bar under each name (dashboard «تحلیل این ماه»).
   * `dot`: a color dot matching the donut slice and «۵۳٪ · مبلغ» (charts page).
   */
  variant?: 'bar' | 'dot'
  /** Dot color per row, same order as `items`. */
  colors?: string[]
}

/** Category rows shared by the dashboard analysis block and the charts page. */
export default function CategoryShareList({
  items,
  tone,
  variant = 'bar',
  colors = []
}: CategoryShareListProps) {
  const [grown, setGrown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (grown) return

    const frame = requestAnimationFrame(() => setGrown(true))

    return () => cancelAnimationFrame(frame)
  }, [grown])

  const toneText = tone === 'income' ? 'text-success' : 'text-danger'
  const barColor = tone === 'income' ? 'var(--color-income)' : 'var(--color-expense)'

  return (
    <ul className={calmListClass}>
      {items.map((item, index) => (
        <li key={item.name} className={calmRowClass}>
          {variant === 'dot' ? (
            <span
              className={calmDotClass}
              style={{ background: colors[index] ?? barColor }}
              aria-hidden="true"
            />
          ) : null}
          <span className={calmRowMainClass}>
            <span className={calmRowTitleClass} title={item.name}>
              {item.name}
            </span>
            {variant === 'bar' ? (
              <span className={cn('block', calmBarTrackClass)} aria-hidden="true">
                <span
                  className={cn('block', calmBarClass)}
                  style={{
                    background: barColor,
                    transform: `scaleX(${grown ? Math.max(item.share, 0.015) : 0})`
                  }}
                />
              </span>
            ) : null}
          </span>
          <span className={cn(calmRowEndClass, variant === 'bar' && toneText)}>
            {variant === 'dot' ? `${formatPersianPercent(Math.round(item.share * 100))} · ` : null}
            {formatMoney(item.total)}
            {variant === 'bar' ? (
              <span className="sr-only">{` · ${formatPersianPercent(
                Math.round(item.share * 100)
              )}`}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}
