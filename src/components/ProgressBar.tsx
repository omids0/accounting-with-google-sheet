import type { CSSProperties } from 'react'

import { cn } from '../utils/cn'
import { formatPersianNumber } from '../utils/formatMoney'
import { floorPercent } from '../utils/progress'
import {
  progressBarClass,
  progressBarFillClass,
  progressBarGlowClass,
  progressBarLabelClass,
  progressBarMetaClass,
  progressBarShineClass,
  progressBarSweepClass,
  progressBarTrackClass,
  type ProgressBarVariant
} from './ui/progressStyles'

interface ProgressBarProps {
  value: number
  variant?: ProgressBarVariant
  showLabel?: boolean
  animateIndex?: number
  /** Animate fill on mount/update (CSS transform — no per-frame React work) */
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
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

  const style = {
    '--progress-delay': `${Math.min(animateIndex, 10) * 0.07}s`
  } as CSSProperties

  // The fill covers the whole track; in RTL it is pushed toward the start
  // (right) edge so only `clamped`% stays visible, with the gradient sized to it.
  const fillStyle: CSSProperties = {
    transform: `translateX(${100 - clamped}%)`,
    backgroundSize: `${clamped}% 100%`,
    backgroundRepeat: 'no-repeat'
  }

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
          <div className={progressBarFillClass(variant)} style={fillStyle}>
            {showShimmer ? (
              <span
                className={progressBarSweepClass}
                style={{ width: `${clamped}%` }}
                aria-hidden="true"
              >
                <span className={progressBarShineClass} />
                <span className={progressBarGlowClass} />
              </span>
            ) : null}
          </div>
        </div>
        {showLabel ? (
          <span className={cn(progressBarLabelClass(variant), 'numeric')} aria-hidden="true">
            {formatPersianNumber(floorPercent(clamped), { useGrouping: false })}٪
          </span>
        ) : null}
      </div>
    </div>
  )
}
