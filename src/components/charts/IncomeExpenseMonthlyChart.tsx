import type { ReactNode } from 'react'
import { memo, useId, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import ChartTooltip from './ChartTooltip'
import { formatAxisMoney, rtlTickTextProps } from './chartUtils'
import RtlCategoryTick from './RtlCategoryTick'
import { useChartTheme, prefersReducedMotion } from '../../hooks/useChartTheme'
import type { MonthlyFlow } from '../../types'
import { cn } from '../../utils/cn'
import {
  chartBarWrapClass,
  chartCardClass,
  chartMonthlyLegendClass,
  chartMonthlyLegendDotClass,
  chartMonthlyLegendDotExpenseClass,
  chartMonthlyLegendDotIncomeClass,
  chartMonthlyLegendItemClass,
  chartMonthlyWrapClass
} from '../ui/chartStyles'
import { emptyTextClass } from '../ui/displayStyles'

type ChartTooltipEntry = {
  name?: string | number
  dataKey?: string | number
  value?: number | string
}

/** Two 16px bars plus breathing room per month. */
const MONTH_ROW_PX = 48

/** X-axis ticks plus the chart's top and bottom margins. */
const AXIS_BAND_PX = 44

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
      // A month with neither income nor expense would only be an empty row.
      data
        .filter(item => item.income !== 0 || item.expense !== 0)
        .map(item => ({
          ...item,
          shortLabel: item.label.split(' ')[0] ?? item.label
        })),
    [data]
  )

  const height = chartData.length * MONTH_ROW_PX + AXIS_BAND_PX

  const maxLabelLen = chartData.length ? Math.max(...chartData.map(d => d.shortLabel.length)) : 1

  const yAxisWidth = Math.min(72, Math.max(44, Math.ceil(maxLabelLen * 7)))

  return (
    <div className={cn(chartCardClass, 'chart-card--animated', className)}>
      {header}
      {!chartData.length ? (
        <p className={emptyTextClass}>داده‌ای برای این سال ثبت نشده</p>
      ) : (
        <>
          <div className={cn(chartBarWrapClass, chartMonthlyWrapClass)} dir="ltr">
            <ResponsiveContainer width="100%" height={height}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 0, left: 16, bottom: 4 }}
                barGap={4}
                barCategoryGap="18%"
              >
                <defs>
                  <linearGradient id={`${gradientId}-chart-income`} x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor={theme.income} stopOpacity={0.75} />
                    <stop offset="100%" stopColor={theme.income} stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id={`${gradientId}-chart-expense`} x1="1" y1="0" x2="0" y2="0">
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
                  reversed
                  tickFormatter={value => formatAxisMoney(value)}
                  tick={{ fontSize: 10, fill: theme.muted, ...rtlTickTextProps }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  width={yAxisWidth}
                  orientation="right"
                  tick={tickProps => (
                    <RtlCategoryTick
                      {...tickProps}
                      axisWidth={yAxisWidth}
                      tickMargin={6}
                      fill={theme.muted}
                      fontSize={12}
                    />
                  )}
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
          <div className={chartMonthlyLegendClass} dir="rtl">
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
