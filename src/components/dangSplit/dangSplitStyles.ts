import { cn } from '../../utils/cn'

export const dangSplitStatsRowClass = cn(
  'mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-muted'
)

export const dangSplitStatLabelClass = 'text-muted'

export const dangSplitStatValueClass = 'font-bold tabular-nums text-primary-dark'

export const dangSplitStatValueDangerClass = 'font-bold tabular-nums text-danger'

export const dangSplitStatValueSuccessClass = 'font-bold tabular-nums text-success'

export const dangSplitProgressClass = 'mt-2'

export const dangSplitToolbarClass = 'flex flex-col gap-3'

export const dangSplitSectionTitleClass =
  'mt-1 mb-1 text-[0.82rem] font-bold text-[var(--color-primary-dark)]'

export const dangSplitGroupClass = 'flex flex-col gap-2'

export const dangSplitGroupHeaderClass = cn(
  'flex items-center justify-between gap-2 border-b border-border pb-1.5'
)

export const dangSplitGroupHeaderTitleClass = cn(
  'flex items-center gap-2 text-[0.85rem] font-bold text-[var(--color-primary-dark)]'
)

export const dangSplitCountBadgeClass = cn(
  'inline-flex items-center rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5',
  'text-[0.7rem] font-bold text-[var(--color-primary-dark)]'
)

export const dangSplitEmptySectionClass = 'py-1 text-[0.78rem] text-muted'

export const dangSplitBalanceRowClass = 'mt-1 flex items-baseline gap-1.5'

export const dangSplitBalanceLabelClass = 'text-[0.78rem] text-muted'

export const dangSplitBalanceValueClass = (tone: 'debt' | 'credit' | 'settled') =>
  cn(
    'text-[1.15rem] font-extrabold tabular-nums leading-tight',
    tone === 'debt' && 'text-danger',
    tone === 'credit' && 'text-success',
    tone === 'settled' && 'text-muted'
  )

export const dangSplitMetaLineClass = 'mt-1 text-[0.78rem] leading-[1.6] text-muted'

export const dangSplitChipsRowClass = 'mt-2 flex flex-wrap gap-1.5'

export const dangSplitChipClass = cn(
  'inline-flex items-center gap-1 rounded-full border border-border bg-bg',
  'px-2 py-0.5 text-[0.72rem] text-muted'
)

export const dangSplitBreakdownClass = cn(
  'mt-2 flex flex-col gap-1.5 border-t border-border pt-2 text-[0.78rem]'
)

export const dangSplitBreakdownRowClass = 'flex items-center justify-between gap-2'

export const dangSplitStatusClass = (
  tone: 'settled' | 'partial' | 'unpaid' | 'creditor' | 'none'
) =>
  cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-[0.72rem] font-bold',
    tone === 'settled' && 'bg-[var(--color-success-bg)] text-success',
    tone === 'partial' && 'bg-[var(--color-accent-soft)] text-primary-dark',
    tone === 'unpaid' && 'bg-[var(--color-danger-bg)] text-danger',
    tone === 'creditor' && 'bg-[var(--color-success-bg)] text-success',
    tone === 'none' && 'bg-bg text-muted'
  )

export const dangSplitAllocationListClass = 'flex flex-col gap-2'

export const dangSplitAllocationRowClass = cn(
  'flex items-center justify-between gap-2 rounded-sm border border-border p-2'
)

export const dangSplitPercentInputClass = 'w-20'
