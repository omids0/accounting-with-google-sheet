import { memo, useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import ChartTooltip from './ChartTooltip'
import { useChartTheme, prefersReducedMotion } from '../../hooks/useChartTheme'
import { cn } from '../../utils/cn'
import { formatMoney, formatPersianNumber } from '../../utils/formatMoney'
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
  title: string
  data: { name: string; total: number }[]
  tone: 'income' | 'expense'
  className?: string
  maxSlices?: number
}

function buildSlices(
  data: { name: string; total: number }[],
  maxSlices: number
): { name: string; total: number }[] {
  if (data.length <= maxSlices) return data

  const sorted = [...data].sort((a, b) => b.total - a.total)

  const top = sorted.slice(0, maxSlices - 1)

  const restTotal = sorted.slice(maxSlices - 1).reduce((sum, item) => sum + item.total, 0)

  return restTotal > 0 ? [...top, { name: 'سایر', total: restTotal }] : top
}

function CategoryDonutChart({
  title,
  data,
  tone,
  className = '',
  maxSlices = 6
}: CategoryDonutChartProps) {
  const theme = useChartTheme()

  const animate = !prefersReducedMotion()

  const slices = useMemo(() => buildSlices(data, maxSlices), [data, maxSlices])

  const total = useMemo(() => slices.reduce((sum, item) => sum + item.total, 0), [slices])

  const palette = tone === 'income' ? theme.incomePalette : theme.expensePalette

  if (!slices.length) return null

  return (
    <div className={cn(chartCardClass, 'chart-card--animated', className)}>
      <h3 className={chartTitleClass}>{title}</h3>
      <div className={categoryDonutLayoutClass} dir="ltr">
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
            <span className={categoryDonutCenterLabelClass}>مجموع</span>
            <span className={categoryDonutCenterValueClass}>{formatMoney(total)}</span>
          </div>
        </div>

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
                <span className={categoryDonutLegendPctClass}>
                  {formatPersianNumber(pct, { useGrouping: false })}٪
                </span>
                <span className={categoryDonutLegendValueClass} dir="ltr">
                  {formatMoney(slice.total)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default memo(CategoryDonutChart)
