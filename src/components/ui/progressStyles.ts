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
      'progress-bar--static-width [&_.progress-bar__track]:animate-none [&_.progress-bar__fill]:will-change-auto',
    !shimmer &&
      'progress-bar--no-shimmer [&_.progress-bar__shine]:hidden [&_.progress-bar__glow]:hidden',
    className
  )
}

export const progressBarMetaClass = 'progress-bar__meta flex items-center gap-[0.55rem]'

export const progressBarTrackClass = cn(
  'progress-bar__track relative h-[7px] min-w-0 flex-1 overflow-hidden rounded-full',
  '[background:color-mix(in_srgb,var(--color-border)_62%,transparent)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.07)]',
  'animate-[progressTrackIn_0.45s_var(--ease-page)_both] [animation-delay:var(--progress-delay,0s)]'
)

export function progressBarFillClass(variant: ProgressBarVariant = 'default') {
  return cn(
    'progress-bar__fill relative h-full min-w-0 overflow-hidden rounded-[inherit] will-change-[width]',
    variant === 'success' &&
      '[background:linear-gradient(90deg,#15803d_0%,var(--color-success)_55%,#4ade80_100%)] shadow-[0_0_10px_color-mix(in_srgb,var(--color-success)_14%,transparent)]',
    variant === 'complete' &&
      '[background:linear-gradient(90deg,#64748b_0%,#94a3b8_100%)] shadow-none',
    variant === 'default' &&
      '[background:linear-gradient(90deg,var(--color-primary-dark)_0%,var(--color-primary)_55%,var(--color-primary-light)_100%)] shadow-[0_0_10px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]'
  )
}

export const progressBarShineClass = cn(
  'progress-bar__shine pointer-events-none absolute inset-0',
  '[background:linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.05)_35%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.05)_65%,transparent_100%)]',
  'animate-[progressShine_4.8s_ease-in-out_infinite] [animation-delay:calc(var(--progress-delay,0s)+0.8s)]'
)

export const progressBarGlowClass = cn(
  'progress-bar__glow pointer-events-none absolute top-1/2 h-[7px] w-[7px] rounded-full',
  'bg-white/30 opacity-50 blur-[1.5px] shadow-[0_0_4px_rgba(255,255,255,0.25)]',
  'animate-[progressGlowTravel_4.8s_ease-in-out_infinite] [animation-delay:calc(var(--progress-delay,0s)+0.8s)]'
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
