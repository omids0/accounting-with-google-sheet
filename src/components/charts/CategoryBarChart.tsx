import { memo, useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

import ChartTooltip from './ChartTooltip'
import { formatAxisMoney, truncateCategoryLabel } from './chartUtils'
import { useChartTheme, prefersReducedMotion } from '../../hooks/useChartTheme'
import { cn } from '../../utils/cn'
import { chartBarWrapClass, chartCardClass, chartTitleClass } from '../ui/chartStyles'

type ChartTooltipEntry = {
  name?: string | number
  dataKey?: string | number
  value?: number | string
}

interface CategoryBarChartProps {
  title: string
  data: { name: string; total: number }[]
  tone: 'income' | 'expense'
  className?: string
  /** Pass the same width for charts on one page so bars start at the same column. */
  yAxisWidth?: number
}

function CategoryBarChart({
  title,
  data,
  tone,
  className = '',
  yAxisWidth: yAxisWidthProp
}: CategoryBarChartProps) {
  const theme = useChartTheme()

  const animate = !prefersReducedMotion()

  const gradientId = useId().replace(/:/g, '')

  if (!data.length) return null

  const rowHeight = 36

  const height = Math.max(180, data.length * rowHeight)

  const maxLabelLen = Math.max(...data.map(d => d.name.length), 1)

  const yAxisWidth =
    yAxisWidthProp ?? Math.min(68, Math.max(30, Math.ceil(Math.min(maxLabelLen, 9) * 5.2)))

  const maxTotal = Math.max(...data.map(d => d.total), 1)

  const chartData = data.map(item => ({ ...item, maxTotal }))

  return (
    <div className={cn(chartCardClass, 'chart-card--animated', className)}>
      <h3 className={chartTitleClass}>{title}</h3>
      <div className={chartBarWrapClass} dir="ltr">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 4, left: 0, bottom: 2 }}
            barCategoryGap="18%"
          >
            <defs>
              <linearGradient id={`${gradientId}-cat-bar-${tone}`} x1="0" y1="0" x2="1" y2="0">
                <stop
                  offset="0%"
                  stopColor={tone === 'income' ? theme.income : theme.expense}
                  stopOpacity={0.72}
                />
                <stop
                  offset="100%"
                  stopColor={tone === 'income' ? theme.income : theme.expense}
                  stopOpacity={1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              horizontal={false}
              stroke={theme.grid}
              strokeDasharray="4 6"
              strokeOpacity={0.45}
            />
            <XAxis
              type="number"
              domain={[0, maxTotal]}
              tickFormatter={v => formatAxisMoney(v)}
              tick={{ fontSize: 10, fill: theme.muted }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={yAxisWidth}
              orientation="left"
              tick={{ fontSize: 10, fill: theme.muted, textAnchor: 'end' }}
              tickMargin={4}
              tickFormatter={value => truncateCategoryLabel(String(value))}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={props => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as unknown as ChartTooltipEntry[] | undefined}
                  label={String(props.label ?? '')}
                />
              )}
              cursor={{ fill: 'rgba(15, 118, 110, 0.06)', radius: 8 }}
            />
            <Bar
              name="مجموع"
              dataKey="total"
              radius={[0, 8, 8, 0]}
              maxBarSize={22}
              isAnimationActive={animate}
              animationDuration={700}
              animationEasing="ease-out"
              background={{
                fill: theme.accentSoft,
                radius: 8
              }}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={`url(#${gradientId}-cat-bar-${tone})`}
                  fillOpacity={1 - (i % 3) * 0.08}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default memo(CategoryBarChart)
