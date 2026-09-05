import { cn } from '../../utils/cn'

export type ProgressBarVariant = 'default' | 'complete' | 'success'

export function progressBarClass({
  animated = true,
  className
}: {
  variant?: ProgressBarVariant
  animated?: boolean
  className?: string
}) {
  return cn('mt-1.5', !animated && progressBarStaticClass, className)
}

export const progressBarStaticClass =
  '[&_.progress-bar__shine]:hidden [&_.progress-bar__glow]:hidden [&_.progress-bar__track]:animate-none [&_.progress-bar__fill]:will-change-auto [&_.progress-bar__fill]:shadow-none'

export const progressBarMetaClass = 'flex items-center gap-[0.55rem]'

export const progressBarTrackClass = cn(
  'relative h-[7px] min-w-0 flex-1 overflow-hidden rounded-full',
  '[background:color-mix(in_srgb,var(--color-border)_62%,transparent)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.07)]',
  'animate-[progressTrackIn_0.45s_var(--ease-page)_both] [animation-delay:var(--progress-delay,0s)]'
)

export function progressBarFillClass(variant: ProgressBarVariant = 'default') {
  return cn(
    'relative h-full min-w-0 rounded-[inherit] will-change-[width]',
    variant === 'success' &&
      '[background:linear-gradient(90deg,#15803d_0%,var(--color-success)_55%,#4ade80_100%)] shadow-[0_0_14px_color-mix(in_srgb,var(--color-success)_30%,transparent)]',
    variant === 'complete' &&
      '[background:linear-gradient(90deg,#64748b_0%,#94a3b8_100%)] shadow-none',
    variant === 'default' &&
      '[background:linear-gradient(90deg,var(--color-primary-dark)_0%,var(--color-primary)_55%,var(--color-primary-light)_100%)] shadow-[0_0_14px_color-mix(in_srgb,var(--color-primary)_32%,transparent)]'
  )
}

export const progressBarShineClass = cn(
  'absolute inset-0',
  '[background:linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_35%,rgba(255,255,255,0.5)_50%,rgba(255,255,255,0.15)_65%,transparent_100%)]',
  'animate-[progressShine_2.8s_ease-in-out_infinite] [animation-delay:calc(var(--progress-delay,0s)+0.65s)]'
)

export const progressBarGlowClass =
  'pointer-events-none absolute top-1/2 left-0 h-[10px] w-[10px] -translate-x-[40%] -translate-y-1/2 rounded-full bg-white/85 opacity-85 blur-[2px]'

export function progressBarLabelClass(variant: ProgressBarVariant = 'default') {
  return cn(
    'numeric min-w-[2.1rem] shrink-0 text-left text-[0.68rem] font-extrabold leading-none',
    variant === 'success' && 'text-success',
    variant === 'complete' && 'text-muted',
    variant === 'default' && 'text-primary-dark'
  )
}

export const installmentProgressClass = 'h-full rounded'
