import { useEffect, useState } from 'react'

import { prefersReducedMotion } from '../../../hooks/useChartTheme'
import type { ItemStat } from '../../../services/lineItemsReport'
import { cn } from '../../../utils/cn'
import { formatPersianNumber } from '../../../utils/formatMoney'
import { formatPersianPercent } from '../../charts/chartUtils'
import MoneyText from '../../MoneyText'
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
} from '../../ui/calmListStyles'

/** Mobile list of the report: name, count and average, a thin share bar, the total. */
export default function LineItemRows({
  items,
  grandTotal,
  tone,
  onOpen
}: {
  items: ItemStat[]
  /** Total of all items of the period; the bars show each item's share of it. */
  grandTotal: number
  tone: 'income' | 'expense'
  onOpen: (item: ItemStat) => void
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
      {items.map(item => {
        const share = grandTotal > 0 ? item.total / grandTotal : 0

        return (
          <li key={item.key} className={calmRowClass}>
            <button
              type="button"
              className={calmRowButtonClass}
              onClick={() => onOpen(item)}
              aria-label={`گزارش قلم ${item.name}`}
            >
              <span className={calmRowHeadClass}>
                <span className={calmRowTitleClass} title={item.name}>
                  {item.name}
                </span>
              </span>
              <span className={calmRowSubClass}>
                {`${formatPersianNumber(item.count)} بار · میانگین ${formatPersianNumber(
                  Math.round(item.average)
                )}`}
              </span>
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
              <MoneyText amount={item.total} />
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
