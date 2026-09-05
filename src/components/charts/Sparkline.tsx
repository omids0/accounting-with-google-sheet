import { useId, useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

import { useChartTheme, prefersReducedMotion } from '../../hooks/useChartTheme'
import { cn } from '../../utils/cn'
import { sparklineClass } from '../ui/chartStyles'

type SparklineTone = 'income' | 'expense' | 'primary' | 'neutral'

interface SparklineProps {
  data: number[]
  tone?: SparklineTone
  className?: string
  height?: number
}

function toneColor(theme: ReturnType<typeof useChartTheme>, tone: SparklineTone): string {
  switch (tone) {
    case 'income':
      return theme.income

    case 'expense':
      return theme.expense

    case 'primary':
      return theme.primary

    default:
      return theme.muted
  }
}

export default function Sparkline({
  data,
  tone = 'neutral',
  className,
  height = 28
}: SparklineProps) {
  const theme = useChartTheme()

  const animate = !prefersReducedMotion()

  const color = toneColor(theme, tone)

  const gradientId = useId().replace(/:/g, '')

  const chartData = useMemo(() => data.map((value, index) => ({ index, value })), [data])

  if (chartData.length < 2) return null

  const gradientRef = `${gradientId}-sparkline-${tone}`

  return (
    <div className={cn(sparklineClass, className)} aria-hidden="true" dir="ltr">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientRef} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientRef})`}
            dot={false}
            isAnimationActive={animate}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
