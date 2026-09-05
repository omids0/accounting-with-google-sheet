import type { CSSProperties, ReactNode } from 'react'

import AnimatedMoneyDisplay from './AnimatedMoneyDisplay'
import Sparkline from './charts/Sparkline'
import type { MoneyDisplayTone } from './MoneyDisplay'
import {
  sparklineClass,
  sparklineWideClass,
  statCardClass,
  statCardValueRowClass,
  statCardValueRowWideClass,
  statFlowModifierClass,
  statLabelClass
} from './ui/chartStyles'
import { cn } from '../utils/cn'

type StatCardVariant = 'income' | 'expense' | 'balance' | 'flow' | 'default'
type SparklineTone = 'income' | 'expense' | 'primary' | 'neutral'
type FlowDirection = 'positive' | 'negative' | 'neutral'

interface StatCardProps {
  label: string
  amount: number
  variant?: StatCardVariant
  wide?: boolean
  tone?: MoneyDisplayTone
  flowDirection?: FlowDirection
  sparklineData?: number[]
  sparklineTone?: SparklineTone
  animateIndex?: number
  animated?: boolean
  lift?: boolean
  className?: string
  footer?: ReactNode
}

function defaultTone(variant: StatCardVariant, flowDirection?: FlowDirection): MoneyDisplayTone {
  if (variant === 'income') return 'income'
  if (variant === 'expense') return 'expense'
  if (variant === 'balance') return 'primary'
  if (variant === 'flow') {
    if (flowDirection === 'negative') return 'negative'
    if (flowDirection === 'positive') return 'positive'

    return 'primary'
  }

  return 'default'
}

export default function StatCard({
  label,
  amount,
  variant = 'default',
  wide = false,
  tone,
  flowDirection = 'neutral',
  sparklineData,
  sparklineTone,
  animateIndex,
  animated = true,
  lift = false,
  className,
  footer
}: StatCardProps) {
  const style: CSSProperties | undefined =
    animateIndex != null ? { animationDelay: `${animateIndex * 0.07}s` } : undefined

  const resolvedTone = tone ?? defaultTone(variant, flowDirection)

  const resolvedSparklineTone =
    sparklineTone ??
    (variant === 'income'
      ? 'income'
      : variant === 'expense'
      ? 'expense'
      : variant === 'flow'
      ? flowDirection === 'negative'
        ? 'expense'
        : flowDirection === 'positive'
        ? 'income'
        : 'primary'
      : 'primary')

  const showSparkline = !!sparklineData && sparklineData.length > 1

  return (
    <div
      className={cn(
        'stat-card',
        statCardClass({ variant, wide, lift, animated }),
        variant === 'flow' && statFlowModifierClass(flowDirection),
        className
      )}
      style={style}
    >
      <span className={statLabelClass}>{label}</span>
      <div className={cn(statCardValueRowClass, wide && statCardValueRowWideClass)}>
        <AnimatedMoneyDisplay
          amount={amount}
          size={wide ? 'stat-wide' : 'stat'}
          tone={resolvedTone}
          animated={animated}
        />
        {showSparkline ? (
          <Sparkline
            data={sparklineData}
            tone={resolvedSparklineTone}
            className={wide ? sparklineWideClass : sparklineClass}
          />
        ) : null}
      </div>
      {footer}
    </div>
  )
}
