import type { CSSProperties } from 'react'

import { useAnimatedProgress } from '../hooks/useAnimatedProgress'
import { cn } from '../utils/cn'
import { formatPersianNumber } from '../utils/formatMoney'
import {
  progressBarClass,
  progressBarFillClass,
  progressBarGlowClass,
  progressBarLabelClass,
  progressBarMetaClass,
  progressBarShineClass,
  progressBarTrackClass,
  type ProgressBarVariant
} from './ui/progressStyles'

interface ProgressBarProps {
  value: number
  variant?: ProgressBarVariant
  showLabel?: boolean
  animateIndex?: number
  /** Animate fill width on mount/update */
  animated?: boolean
  /** Sparkle/shine sweep on the fill bar */
  shimmer?: boolean
  className?: string
  'aria-label'?: string
}

export default function ProgressBar({
  value,
  variant = 'default',
  showLabel = true,
  animateIndex = 0,
  animated = true,
  shimmer = true,
  className,
  'aria-label': ariaLabel
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  const animatedValue = useAnimatedProgress(clamped, 750, animated)

  const displayPct = Math.round(animatedValue)

  const style = {
    '--progress-delay': `${Math.min(animateIndex, 10) * 0.07}s`
  } as CSSProperties

  const showShimmer = shimmer && variant !== 'complete' && clamped > 0

  return (
    <div
      className={progressBarClass({ variant, animated, shimmer: showShimmer, className })}
      style={style}
    >
      <div className={progressBarMetaClass}>
        <div
          className={progressBarTrackClass}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={ariaLabel}
        >
          <div className={progressBarFillClass(variant)} style={{ width: `${animatedValue}%` }}>
            {showShimmer ? <span className={progressBarShineClass} aria-hidden="true" /> : null}
            {showShimmer ? <span className={progressBarGlowClass} aria-hidden="true" /> : null}
          </div>
        </div>
        {showLabel ? (
          <span className={cn(progressBarLabelClass(variant), 'numeric')} aria-hidden="true">
            {formatPersianNumber(displayPct, { useGrouping: false })}٪
          </span>
        ) : null}
      </div>
    </div>
  )
}
