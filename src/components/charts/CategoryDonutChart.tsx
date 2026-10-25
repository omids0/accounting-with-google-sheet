import { memo, useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import ChartTooltip from './ChartTooltip'
import { buildDonutSlices, donutCenterValue, formatPersianPercent } from './chartUtils'
import { useMaskedText } from '../../hooks/useAmountsHidden'
import { useChartTheme, prefersReducedMotion } from '../../hooks/useChartTheme'
import { cn } from '../../utils/cn'
import { getCurrencySymbol } from '../../utils/formatMoney'
import MaskedAmount from '../MaskedAmount'
import MoneyText from '../MoneyText'
import {
  categoryDonutCenterClass,
  categoryDonutCenterLabelClass,
  categoryDonutCenterValueClass,
  categoryDonutChartWrapClass,
  categoryDonutLayoutClass,
  categoryDonutLegendClass,
  categoryDonutLegendDotClass,
  categoryDonutLegendItemClass,
  categoryDonutLegendNameClass,
  categoryDonutLegendPctClass,
  categoryDonutSliceClass,
  categoryDonutLegendValueClass,
  chartCardClass,
  chartTitleClass
} from '../ui/chartStyles'

type ChartTooltipEntry = {
  name?: string | number
  dataKey?: string | number
  value?: number | string
}

interface CategoryDonutChartProps {
  /** Omitted when the page's own section header names the chart. */
  title?: string
  data: { name: string; total: number }[]
  tone: 'income' | 'expense'
  className?: string
  maxSlices?: number
  /** Off when the page lists the categories itself (charts page). */
  showLegend?: boolean
  /** Label under the center total; defaults to «مجموع». */
  centerLabel?: string
}

/** Inner ring is 100px across; the number is never ellipsised (see `donutCenterValue`). */
const donutCenterValueFitClass =
  'max-w-[92px] whitespace-nowrap text-[0.74rem] leading-tight [direction:ltr] [unicode-bidi:isolate]'

/** A long amount that still fits whole, one step smaller. */
const donutCenterValueSmallClass = 'text-[0.62rem]'

function CategoryDonutChart({
  title,
  data,
  tone,
  className = '',
  maxSlices = 6,
  showLegend = true,
  centerLabel = 'مجموع'
}: CategoryDonutChartProps) {
  const theme = useChartTheme()

  const animate = !prefersReducedMotion()

  const slices = useMemo(() => buildDonutSlices(data, maxSlices), [data, maxSlices])

  const total = useMemo(() => slices.reduce((sum, item) => sum + item.total, 0), [slices])

  const center = useMemo(() => donutCenterValue(total), [total])

  const maskText = useMaskedText()

  const palette = tone === 'income' ? theme.incomePalette : theme.expensePalette

  if (!slices.length) return null

  return (
    <div className={cn(chartCardClass, 'chart-card--animated', className)}>
      {title ? <h3 className={chartTitleClass}>{title}</h3> : null}
      <div className="@container">
        <div
          className={cn(categoryDonutLayoutClass, !showLegend && '@min-[28rem]:grid-cols-1')}
          dir="ltr"
        >
          <div className={categoryDonutChartWrapClass}>
            <ResponsiveContainer width="100%" height={168}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={animate}
                  animationDuration={700}
                  animationEasing="ease-out"
                >
                  {slices.map((slice, index) => (
                    <Cell
                      key={slice.name}
                      fill={palette[index % palette.length]}
                      className={categoryDonutSliceClass}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={props => (
                    <ChartTooltip
                      active={props.active}
                      payload={props.payload as unknown as ChartTooltipEntry[] | undefined}
                      label={String(props.label ?? '')}
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className={categoryDonutCenterClass} dir="rtl">
              <span className={categoryDonutCenterLabelClass}>{centerLabel}</span>
              <span
                className={cn(
                  categoryDonutCenterValueClass,
                  donutCenterValueFitClass,
                  center.small && donutCenterValueSmallClass,
                  center.compact && 'pointer-events-auto'
                )}
                title={
                  center.compact ? maskText(`${center.full} ${getCurrencySymbol()}`) : undefined
                }
              >
                <MaskedAmount size="stat">
                  {center.compact ? (
                    <>
                      <span aria-hidden="true">{center.text}</span>
                      <span className="sr-only">{center.full}</span>
                    </>
                  ) : (
                    center.text
                  )}
                </MaskedAmount>
              </span>
              <span className={categoryDonutCenterLabelClass}>{getCurrencySymbol()}</span>
            </div>
          </div>

          {showLegend ? (
            <ul className={categoryDonutLegendClass} dir="rtl">
              {slices.map((slice, index) => {
                const pct = total > 0 ? Math.round((slice.total / total) * 100) : 0

                return (
                  <li key={slice.name} className={categoryDonutLegendItemClass}>
                    <span
                      className={categoryDonutLegendDotClass}
                      style={{ background: palette[index % palette.length] }}
                    />
                    <span className={categoryDonutLegendNameClass}>{slice.name}</span>
                    <span className={categoryDonutLegendPctClass}>{formatPersianPercent(pct)}</span>
                    <span className={categoryDonutLegendValueClass}>
                      <MoneyText amount={slice.total} />
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default memo(CategoryDonutChart)
