import { cn } from '../../utils/cn'

const skeletonBase = cn(
  'block rounded-md',
  '[background:linear-gradient(90deg,rgba(15,118,110,0.07)_0%,rgba(15,118,110,0.14)_50%,rgba(15,118,110,0.07)_100%)]',
  '[background-size:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]'
)

export function skeletonClass(variant: 'text' | 'rect' | 'circle' = 'text', className?: string) {
  return cn(
    skeletonBase,
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
  'h-[7px] w-full overflow-hidden rounded-full',
  '[background:color-mix(in_srgb,var(--color-border)_55%,transparent)]'
)

export const skeletonRecordItemClass = cn(
  'flex items-start justify-between gap-2 border-b border-border py-[0.85rem] last:border-b-0'
)

export const skeletonRecordActionsClass = 'flex flex-shrink-0 items-center gap-2'

export const skeletonRecordsCardClass = 'skeleton-records-card pointer-events-none'

export const skeletonFilterChipsClass = 'pointer-events-none mb-[0.65rem]'

export const skeletonFilterChipClass = cn(
  'inline-flex min-h-[1.65rem] items-center rounded-full border px-[0.55rem] py-[0.28rem]',
  'border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border))]',
  '[background:color-mix(in_srgb,var(--color-primary)_4%,var(--color-surface))]'
)

export const skeletonStatCardClass = 'pointer-events-none'

export const skeletonBreakdownClass = 'mt-[0.85rem] flex flex-col gap-[0.65rem]'

export const skeletonBreakdownRowClass = 'flex items-center justify-between gap-4'

export const skeletonSettingsClass = 'skeleton-settings flex flex-col gap-3'

export const skeletonFormRowClass = '[&+&]:mt-[0.65rem]'

export const skeletonFormClass = 'skeleton-form flex flex-col'
