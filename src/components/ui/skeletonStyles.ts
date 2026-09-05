import { cn } from '../../utils/cn'

export const skeletonShineClass = cn(
  'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
  '[background:linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_35%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.04)_65%,transparent_100%)]',
  'animate-[progressShine_4.8s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-0'
)

export const skeletonGlowClass = cn(
  'pointer-events-none absolute top-1/2 h-[7px] w-[7px] rounded-full',
  'bg-white/28 opacity-45 blur-[1.5px] shadow-[0_0_4px_rgba(255,255,255,0.2)]',
  'animate-[progressGlowTravel_4.8s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-0'
)

const skeletonSurfaceClass = cn(
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

export const skeletonListClass = 'skeleton-list flex flex-col gap-stack'

export const skeletonCardClass = cn(
  'pointer-events-none',
  '[&_.installment-header]:cursor-default [&_.installment-header:hover]:bg-transparent',
  '[&.dang-card:hover]:bg-surface'
)

export const skeletonProgressTrackClass = cn(
  'relative h-[7px] w-full overflow-hidden rounded-full',
  '[background:color-mix(in_srgb,var(--color-border)_55%,transparent)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.07)]'
)

export const skeletonProgressFillClass = cn(
  'absolute inset-y-0 start-0 overflow-hidden rounded-[inherit]',
  '[background:linear-gradient(90deg,var(--color-primary-dark)_0%,var(--color-primary)_55%,var(--color-primary-light)_100%)]'
)

export const skeletonRecordItemClass = cn(
  'flex items-start justify-between gap-2 border-b border-border py-[0.85rem] last:border-b-0'
)

export const skeletonRecordActionsClass = 'flex flex-shrink-0 items-center gap-2'

export const skeletonRecordsCardClass = 'skeleton-records-card pointer-events-none'

export const skeletonFilterChipsClass = 'pointer-events-none'

export const skeletonFilterChipClass = cn(
  'inline-flex min-h-touch-min items-center rounded-full border px-[0.75rem] py-[0.4rem]',
  'border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))]',
  '[background:color-mix(in_srgb,var(--color-primary)_5%,var(--color-surface))]'
)

export const skeletonStatCardClass = cn(
  'pointer-events-none rounded-[calc(var(--radius-sm)+2px)] border border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border))]',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_4%,var(--color-surface))_0%,var(--color-surface)_55%)]',
  'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_14px_color-mix(in_srgb,var(--color-primary)_6%,transparent)]'
)

export const skeletonBreakdownClass = 'mt-[0.85rem] flex flex-col gap-[0.65rem]'

export const skeletonBreakdownRowClass = 'flex items-center justify-between gap-4'

export const skeletonSettingsClass = 'skeleton-settings flex flex-col gap-3'

export const skeletonFormRowClass = '[&+&]:mt-[0.65rem]'

export const skeletonFormClass = 'skeleton-form flex flex-col'

export const skeletonActionBtnSizeClass = 'h-touch-min w-touch-min rounded-md'
