import type { CSSProperties, ReactNode } from 'react';
import AnimatedMoneyDisplay from './AnimatedMoneyDisplay';
import Sparkline from './charts/Sparkline';
import type { MoneyDisplayTone } from './MoneyDisplay';

type StatCardVariant = 'income' | 'expense' | 'balance' | 'flow' | 'default';
type SparklineTone = 'income' | 'expense' | 'primary' | 'neutral';
type FlowDirection = 'positive' | 'negative' | 'neutral';

interface StatCardProps {
  label: string;
  amount: number;
  variant?: StatCardVariant;
  wide?: boolean;
  tone?: MoneyDisplayTone;
  flowDirection?: FlowDirection;
  sparklineData?: number[];
  sparklineTone?: SparklineTone;
  animateIndex?: number;
  animated?: boolean;
  lift?: boolean;
  className?: string;
  footer?: ReactNode;
}

function defaultTone(variant: StatCardVariant, flowDirection?: FlowDirection): MoneyDisplayTone {
  if (variant === 'income') return 'income';
  if (variant === 'expense') return 'expense';
  if (variant === 'balance') return 'primary';
  if (variant === 'flow') {
    if (flowDirection === 'negative') return 'negative';
    if (flowDirection === 'positive') return 'positive';
    return 'primary';
  }
  return 'default';
}

function flowModifier(flowDirection?: FlowDirection): string {
  if (flowDirection === 'negative') return ' stat-flow-negative';
  if (flowDirection === 'positive') return ' stat-flow-positive';
  return '';
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
  className = '',
  footer,
}: StatCardProps) {
  const variantClass =
    variant === 'income'
      ? ' stat-income'
      : variant === 'expense'
        ? ' stat-expense'
        : variant === 'balance'
          ? ' stat-balance'
          : variant === 'flow'
            ? ` stat-flow${flowModifier(flowDirection)}`
            : '';

  const style: CSSProperties | undefined =
    animateIndex != null ? { animationDelay: `${animateIndex * 0.07}s` } : undefined;

  const resolvedTone = tone ?? defaultTone(variant, flowDirection);
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
          : 'primary');

  const showSparkline = !!sparklineData && sparklineData.length > 1;

  return (
    <div
      className={`${wide ? 'card ' : ''}stat-card stat-card--animated${variantClass}${wide ? ' stat-card-wide' : ''}${
        lift ? ' stat-card--lift' : ''
      }${className ? ` ${className}` : ''}`}
      style={style}
    >
      <span className="stat-label">{label}</span>
      <div className={`stat-card__value-row${wide ? ' stat-card__value-row--wide' : ''}`}>
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
            className={wide ? 'sparkline--wide' : undefined}
          />
        ) : null}
      </div>
      {footer}
    </div>
  );
}
