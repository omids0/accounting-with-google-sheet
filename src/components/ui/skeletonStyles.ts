import { cn, cx } from '../../utils/cn'

export const skeletonShineClass = cx(
  'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
  '[background:linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_35%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.04)_65%,transparent_100%)]',
  'animate-[progressShine_4.8s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-0'
)

/** Full-width layer with the glow dot at its edge — travels by transform, no blur filter. */
export const skeletonGlowClass = cx(
  'pointer-events-none absolute inset-0 opacity-0',
  '[background:radial-gradient(circle_at_0_50%,rgba(255,255,255,0.36)_0,rgba(255,255,255,0.2)_2px,transparent_4.5px)]',
  'animate-[progressGlowTravel_4.8s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-0'
)

const skeletonSurfaceClass = cx(
  'relative block overflow-hidden',
  '[background:color-mix(in_srgb,var(--color-border)_58%,transparent)]'
)

export function skeletonClass(variant: 'text' | 'rect' | 'circle' = 'text', className?: string) {
  return cn(
    skeletonSurfaceClass,
    variant === 'text' && 'h-[0.875rem]',
    variant === 'rect' && 'rounded-sm',
    variant === 'circle' && 'flex-shrink-0 rounded-full',
    className
  )
}

export const skeletonCardClass = cx(
  'pointer-events-none',
  '[&_.installment-header]:cursor-default [&_.installment-header:hover]:bg-transparent',
  '[&.dang-card:hover]:bg-surface'
)

export const skeletonProgressTrackClass = cx(
  'relative h-[7px] w-full overflow-hidden rounded-full',
  '[background:color-mix(in_srgb,var(--color-border)_55%,transparent)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.07)]'
)

export const skeletonProgressFillClass = cx(
  'absolute inset-y-0 start-0 overflow-hidden rounded-[inherit]',
  '[background:linear-gradient(90deg,var(--color-primary-dark)_0%,var(--color-primary)_55%,var(--color-primary-light)_100%)]'
)

export const skeletonRecordItemClass = cx(
  'flex items-start justify-between gap-2 border-b border-border py-[0.85rem] last:border-b-0'
)

export const skeletonRecordActionsClass = 'flex flex-shrink-0 items-center gap-2'

export const skeletonRecordsCardClass = 'skeleton-records-card pointer-events-none'

export const skeletonFilterChipClass = cx(
  'inline-flex min-h-touch-min items-center rounded-full border px-[0.75rem] py-[0.4rem]',
  'border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))]',
  '[background:color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))]'
)

export const skeletonBreakdownClass = 'mt-[0.85rem] flex flex-col gap-[0.65rem]'

export const skeletonBreakdownRowClass = 'flex items-center justify-between gap-4'

export const skeletonFormRowClass = '[&+&]:mt-[0.65rem]'

export const skeletonFormClass = 'skeleton-form flex flex-col'
