import type { ReactNode } from 'react'
import { memo, useId, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import ChartTooltip from './ChartTooltip'
import { formatAxisMoney } from './chartUtils'
import { useChartTheme, prefersReducedMotion } from '../../hooks/useChartTheme'
import type { MonthlyFlow } from '../../types'

type ChartTooltipEntry = {
  name?: string | number
  dataKey?: string | number
  value?: number | string
}

interface IncomeExpenseMonthlyChartProps {
  data: MonthlyFlow[]
  header?: ReactNode
  className?: string
}

function IncomeExpenseMonthlyChart({
  data,
  header,
  className = ''
}: IncomeExpenseMonthlyChartProps) {
  const theme = useChartTheme()

  const animate = !prefersReducedMotion()

  const gradientId = useId().replace(/:/g, '')

  const chartData = useMemo(
    () =>
      data.map(item => ({
        ...item,
        shortLabel: item.label.split(' ')[0] ?? item.label
      })),
    [data]
  )

  const height = Math.max(300, chartData.length * 56)

  const maxLabelLen = chartData.length ? Math.max(...chartData.map(d => d.shortLabel.length)) : 1

  const yAxisWidth = Math.min(72, Math.max(44, Math.ceil(maxLabelLen * 7)))

  return (
    <div className={`card chart-card chart-card--animated ${className}`.trim()}>
      {header}
      {!chartData.length ? (
        <p className="empty-text">داده‌ای برای این سال ثبت نشده</p>
      ) : (
        <>
          <div className="chart-bar-wrap chart-monthly-wrap" dir="ltr">
            <ResponsiveContainer width="100%" height={height}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                barGap={4}
                barCategoryGap="18%"
              >
                <defs>
                  <linearGradient id={`${gradientId}-chart-income`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={theme.income} stopOpacity={0.75} />
                    <stop offset="100%" stopColor={theme.income} stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id={`${gradientId}-chart-expense`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={theme.expense} stopOpacity={0.75} />
                    <stop offset="100%" stopColor={theme.expense} stopOpacity={1} />
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
                  tickFormatter={value => formatAxisMoney(value)}
                  tick={{ fontSize: 10, fill: theme.muted }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  width={yAxisWidth}
                  orientation="left"
                  tick={{ fontSize: 12, fill: theme.muted, textAnchor: 'end' }}
                  tickMargin={6}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={props => (
                    <ChartTooltip
                      active={props.active}
                      payload={props.payload as unknown as ChartTooltipEntry[] | undefined}
                      label={
                        props.payload?.[0]?.payload?.label
                          ? String(props.payload[0].payload.label)
                          : props.label != null
                          ? String(props.label)
                          : undefined
                      }
                    />
                  )}
                  cursor={{ fill: 'rgba(15, 118, 110, 0.06)', radius: 8 }}
                />
                <Bar
                  name="income"
                  dataKey="income"
                  fill={`url(#${gradientId}-chart-income)`}
                  radius={[0, 6, 6, 0]}
                  maxBarSize={16}
                  isAnimationActive={animate}
                  animationDuration={750}
                  animationEasing="ease-out"
                />
                <Bar
                  name="expense"
                  dataKey="expense"
                  fill={`url(#${gradientId}-chart-expense)`}
                  radius={[0, 6, 6, 0]}
                  maxBarSize={16}
                  isAnimationActive={animate}
                  animationDuration={850}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-monthly-legend" dir="rtl">
            <span className="chart-monthly-legend-item">
              <span className="chart-monthly-legend-dot chart-monthly-legend-dot--income" />
              درآمد
            </span>
            <span className="chart-monthly-legend-item">
              <span className="chart-monthly-legend-dot chart-monthly-legend-dot--expense" />
              هزینه
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default memo(IncomeExpenseMonthlyChart)
