import { cn } from '../../utils/cn'

export type ProgressBarVariant = 'default' | 'complete' | 'success'

export function progressBarClass({
  variant = 'default',
  animated = true,
  shimmer = true,
  className
}: {
  variant?: ProgressBarVariant
  animated?: boolean
  shimmer?: boolean
  className?: string
}) {
  return cn(
    'progress-bar mt-1.5',
    variant === 'success' && 'progress-bar--success',
    variant === 'complete' && 'progress-bar--complete',
    !animated &&
      'progress-bar--static-width [&_.progress-bar-track]:animate-none [&_.progress-bar-fill]:animate-none [&_.progress-bar-fill]:transition-none',
    !shimmer && 'progress-bar--no-shimmer [&_.progress-bar-sweep]:hidden',
    className
  )
}

export const progressBarMetaClass = 'progress-bar__meta flex items-center gap-[0.55rem]'

export const progressBarTrackClass = cn(
  'progress-bar-track relative h-[7px] min-w-0 flex-1 overflow-hidden rounded-full',
  '[background:color-mix(in_srgb,var(--color-border)_62%,transparent)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.07)]',
  'animate-[progressTrackIn_0.45s_var(--ease-page)_both] [animation-delay:var(--progress-delay,0s)]'
)

/**
 * The fill spans the whole track and slides in from the RTL start edge with
 * transform only, so growing runs on the compositor instead of re-laying out
 * every frame. The gradient is sized to the visible part (see ProgressBar).
 */
export function progressBarFillClass(variant: ProgressBarVariant = 'default') {
  return cn(
    'progress-bar-fill absolute inset-0 overflow-hidden rounded-[inherit]',
    'transition-transform duration-[750ms] ease-[cubic-bezier(0.33,1,0.68,1)]',
    'animate-[progressFillIn_750ms_cubic-bezier(0.33,1,0.68,1)_backwards] [animation-delay:var(--progress-delay,0s)]',
    variant === 'success' &&
      '[background:linear-gradient(90deg,#15803d_0%,var(--color-success)_55%,#4ade80_100%)] shadow-[0_0_10px_color-mix(in_srgb,var(--color-success)_14%,transparent)]',
    variant === 'complete' &&
      '[background:linear-gradient(90deg,#64748b_0%,#94a3b8_100%)] shadow-none',
    variant === 'default' &&
      '[background:linear-gradient(90deg,var(--color-primary-dark)_0%,var(--color-primary)_55%,var(--color-primary-light)_100%)] shadow-[0_0_10px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]'
  )
}

/** Holds the shine + glow over the visible part of the fill only. */
export const progressBarSweepClass =
  'progress-bar-sweep pointer-events-none absolute inset-y-0 left-0 motion-reduce:hidden'

/** Two sweeps after mount, then rest — no infinite compositor work per bar. */
export const progressBarShineClass = cn(
  'progress-bar__shine absolute inset-0 opacity-0',
  '[background:linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.05)_35%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.05)_65%,transparent_100%)]',
  'animate-[progressShine_4.8s_ease-in-out_2] [animation-delay:calc(var(--progress-delay,0s)+0.8s)]'
)

export const progressBarGlowClass = cn(
  'progress-bar__glow absolute inset-0 opacity-0',
  '[background:radial-gradient(circle_at_0_50%,rgba(255,255,255,0.4)_0,rgba(255,255,255,0.22)_2px,transparent_4.5px)]',
  'animate-[progressGlowTravel_4.8s_ease-in-out_2] [animation-delay:calc(var(--progress-delay,0s)+0.8s)]'
)

export function progressBarLabelClass(variant: ProgressBarVariant = 'default') {
  return cn(
    'progress-bar__label numeric min-w-[2.1rem] shrink-0 text-left text-[0.72rem] font-extrabold leading-none',
    variant === 'success' && 'text-success',
    variant === 'complete' && 'text-muted',
    variant === 'default' && 'text-primary-dark'
  )
}

export const installmentProgressClass = 'h-full rounded'
