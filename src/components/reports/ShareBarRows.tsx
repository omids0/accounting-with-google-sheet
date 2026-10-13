import { useEffect, useState } from 'react'

import { prefersReducedMotion } from '../../hooks/useChartTheme'
import { cn } from '../../utils/cn'
import { formatPersianPercent } from '../charts/chartUtils'
import MoneyText from '../MoneyText'
import {
  calmBarClass,
  calmBarTrackClass,
  calmListClass,
  calmRowButtonClass,
  calmRowClass,
  calmRowEndClass,
  calmRowHeadClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

export interface ShareBarRow {
  key: string
  name: string
  /** The muted line under the name. */
  sub: string
  total: number
  ariaLabel: string
}

/** Report rows: a name, a muted line, a thin share bar and the total; a tap opens the row. */
export default function ShareBarRows({
  rows,
  grandTotal,
  tone,
  onOpen
}: {
  rows: ShareBarRow[]
  /** Total of the period; the bars show each row's share of it. */
  grandTotal: number
  tone: 'income' | 'expense'
  onOpen: (key: string) => void
}) {
  const [grown, setGrown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (grown) return

    const frame = requestAnimationFrame(() => setGrown(true))

    return () => cancelAnimationFrame(frame)
  }, [grown])

  const barColor = tone === 'income' ? 'var(--color-income)' : 'var(--color-expense)'

  return (
    <ul className={calmListClass}>
      {rows.map(row => {
        const share = grandTotal > 0 ? row.total / grandTotal : 0

        return (
          <li key={row.key} className={calmRowClass}>
            <button
              type="button"
              className={calmRowButtonClass}
              onClick={() => onOpen(row.key)}
              aria-label={row.ariaLabel}
            >
              <span className={calmRowHeadClass}>
                <span className={calmRowTitleClass} title={row.name}>
                  {row.name}
                </span>
              </span>
              <span className={calmRowSubClass}>{row.sub}</span>
              <span className={cn('block', calmBarTrackClass)} aria-hidden="true">
                <span
                  className={cn('block', calmBarClass)}
                  style={{
                    background: barColor,
                    transform: `scaleX(${grown ? Math.max(share, 0.015) : 0})`
                  }}
                />
              </span>
            </button>
            <span className={calmRowEndClass}>
              <MoneyText amount={row.total} />
              <span className="sr-only">{` · ${formatPersianPercent(
                Math.round(share * 100)
              )}`}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
