import { useEffect, useState, type ReactNode } from 'react'

import { BudgetLine, ComparisonBadge, type CategoryInsights } from './CategoryRowInsights'
import { formatPersianPercent } from './chartUtils'
import { prefersReducedMotion } from '../../hooks/useChartTheme'
import { budgetUsage } from '../../services/budgets'
import type { CategoryShare } from '../../types'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import {
  calmBarClass,
  calmBarTrackClass,
  calmBudgetBarColor,
  calmDotClass,
  calmListClass,
  calmRowButtonClass,
  calmRowClass,
  calmRowEndClass,
  calmRowHeadClass,
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
  /** Round 6: budget bars and lines, «↑ ۳۰٪ از شهریور», tap → budget sheet. */
  insights?: CategoryInsights
}

/** With a budget the bar measures spend against it (grey, red past 100%); else the share. */
function rowBar(item: CategoryShare, budget: number | undefined, fallback: string) {
  if (!budget) return { scale: Math.max(item.share, 0.015), color: fallback }

  const usage = budgetUsage(item.total, budget)

  return {
    scale: Math.max(Math.min(1, usage.ratio), 0.015),
    color: usage.over ? calmBudgetBarColor.over : calmBudgetBarColor.within
  }
}

/** Category rows shared by the dashboard analysis block and the charts page. */
export default function CategoryShareList({
  items,
  tone,
  variant = 'bar',
  colors = [],
  insights
}: CategoryShareListProps) {
  const [grown, setGrown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (grown) return

    const frame = requestAnimationFrame(() => setGrown(true))

    return () => cancelAnimationFrame(frame)
  }, [grown])

  const toneText = tone === 'income' ? 'text-success' : 'text-danger'
  const barColor = tone === 'income' ? 'var(--color-income)' : 'var(--color-expense)'
  const budgetMode = Boolean(insights?.budgets && insights.onBudget)

  const renderMain = (item: CategoryShare) => {
    const budget = insights?.budgets?.get(item.name)
    const comparison = insights?.comparisons?.get(item.name)
    const showBar = variant === 'bar' || (budgetMode && budget)
    const bar = rowBar(item, budget, barColor)

    const content: ReactNode = (
      <>
        <span className={calmRowHeadClass}>
          <span className={calmRowTitleClass} title={item.name}>
            {item.name}
          </span>
          {comparison && insights?.previousMonthName ? (
            <ComparisonBadge
              comparison={comparison}
              monthName={insights.previousMonthName}
              tone={tone}
            />
          ) : null}
        </span>
        {showBar ? (
          <span className={cn('block', calmBarTrackClass)} aria-hidden="true">
            <span
              className={cn('block', calmBarClass)}
              style={{ background: bar.color, transform: `scaleX(${grown ? bar.scale : 0})` }}
            />
          </span>
        ) : null}
        {budgetMode ? <BudgetLine spent={item.total} budget={budget} /> : null}
      </>
    )

    if (!budgetMode) return <span className={calmRowMainClass}>{content}</span>

    return (
      <button
        type="button"
        className={calmRowButtonClass}
        onClick={() => insights?.onBudget?.(item.name)}
        aria-haspopup="dialog"
      >
        {content}
      </button>
    )
  }

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
          {renderMain(item)}
          {/* The budget line already carries the amount on the dashboard rows. */}
          {variant === 'bar' && budgetMode ? null : (
            <span className={cn(calmRowEndClass, variant === 'bar' && toneText)}>
              {variant === 'dot'
                ? `${formatPersianPercent(Math.round(item.share * 100))} · `
                : null}
              {formatMoney(item.total)}
              {variant === 'bar' ? (
                <span className="sr-only">{` · ${formatPersianPercent(
                  Math.round(item.share * 100)
                )}`}</span>
              ) : null}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
