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
  animated?: boolean
  className?: string
  'aria-label'?: string
}

export default function ProgressBar({
  value,
  variant = 'default',
  showLabel = true,
  animateIndex = 0,
  animated = true,
  className,
  'aria-label': ariaLabel
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  const animatedValue = useAnimatedProgress(clamped, 750, animated)

  const displayPct = Math.round(animatedValue)

  const style = {
    '--progress-delay': `${Math.min(animateIndex, 10) * 0.07}s`
  } as CSSProperties

  const showMotion = animated && variant !== 'complete'

  return (
    <div className={progressBarClass({ variant, animated, className })} style={style}>
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
            {showMotion ? <span className={progressBarShineClass} aria-hidden="true" /> : null}
            {showMotion ? <span className={progressBarGlowClass} aria-hidden="true" /> : null}
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
