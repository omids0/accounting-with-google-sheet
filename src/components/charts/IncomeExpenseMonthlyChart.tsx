import type { ReactNode } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'

import { prefersReducedMotion } from '../../hooks/useChartTheme'
import type { MonthlyFlow } from '../../types'
import { cn } from '../../utils/cn'
import { formatMoney, formatSignedMoney } from '../../utils/formatMoney'
import {
  chartCardClass,
  chartMonthlyLegendClass,
  chartMonthlyLegendDotClass,
  chartMonthlyLegendDotExpenseClass,
  chartMonthlyLegendDotIncomeClass,
  chartMonthlyLegendItemClass
} from '../ui/chartStyles'
import { emptyTextClass } from '../ui/displayStyles'

interface IncomeExpenseMonthlyChartProps {
  data: MonthlyFlow[]
  header?: ReactNode
  className?: string
}

const listClass = 'relative z-[1] m-0 flex list-none flex-col gap-4 p-0'

const monthHeadClass = 'mb-1.5 flex items-baseline justify-between gap-3'

const monthNameClass = 'text-[0.82rem] font-bold text-[var(--color-text)]'

const netClass = 'whitespace-nowrap font-numeric text-[0.74rem] font-bold tabular-nums'

const barRowClass = 'flex items-center gap-2'

const trackClass =
  'h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-accent-soft)_70%,transparent)]'

const barClass =
  'h-full rounded-full origin-right transition-transform duration-700 ease-out motion-reduce:transition-none'

const valueClass =
  'w-[6.5rem] shrink-0 whitespace-nowrap text-left font-numeric text-[0.7rem] font-semibold tabular-nums text-muted'

/**
 * Income and expense per month as a list: two thin bars per month growing from
 * the right with their exact amounts, and the month's net beside its name.
 * Months with no activity are left out.
 */
function IncomeExpenseMonthlyChart({
  data,
  header,
  className = ''
}: IncomeExpenseMonthlyChartProps) {
  const [grown, setGrown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (grown) return

    const frame = requestAnimationFrame(() => setGrown(true))

    return () => cancelAnimationFrame(frame)
  }, [grown])

  const months = useMemo(() => data.filter(item => item.income !== 0 || item.expense !== 0), [data])

  const max = Math.max(1, ...months.map(item => Math.max(item.income, item.expense)))

  const bar = (value: number, color: string) => (
    <div className={trackClass} aria-hidden="true">
      <div
        className={barClass}
        style={{
          background: color,
          transform: `scaleX(${grown ? (value > 0 ? Math.max(value / max, 0.015) : 0) : 0})`
        }}
      />
    </div>
  )

  return (
    <div className={cn(chartCardClass, 'chart-card--animated', className)}>
      {header}
      {months.length === 0 ? (
        <p className={emptyTextClass}>داده‌ای برای این سال ثبت نشده</p>
      ) : (
        <>
          <ul className={listClass}>
            {months.map(item => {
              const net = item.income - item.expense

              return (
                <li key={item.label}>
                  <div className={monthHeadClass}>
                    <span className={monthNameClass}>{item.label.split(' ')[0] ?? item.label}</span>
                    <span
                      className={cn(netClass, net >= 0 ? 'text-success' : 'text-danger')}
                      title="خالص ماه"
                    >
                      {formatSignedMoney(net, { showPlus: true })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className={barRowClass}>
                      {bar(item.income, 'var(--color-income)')}
                      <span className={valueClass}>{formatMoney(item.income)}</span>
                    </div>
                    <div className={barRowClass}>
                      {bar(item.expense, 'var(--color-expense)')}
                      <span className={valueClass}>{formatMoney(item.expense)}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className={chartMonthlyLegendClass}>
            <span className={chartMonthlyLegendItemClass}>
              <span className={cn(chartMonthlyLegendDotClass, chartMonthlyLegendDotIncomeClass)} />
              درآمد
            </span>
            <span className={chartMonthlyLegendItemClass}>
              <span className={cn(chartMonthlyLegendDotClass, chartMonthlyLegendDotExpenseClass)} />
              هزینه
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default memo(IncomeExpenseMonthlyChart)
