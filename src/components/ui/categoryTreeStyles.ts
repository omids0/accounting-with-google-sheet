import { cn } from '../../utils/cn'

export const categoryTreeControlsClass =
  'mb-3 flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] pb-3'

export const categoryTreeToggleAllClass = cn(
  'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-surface',
  'px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--color-primary-dark)]',
  'transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-accent-soft)]',
  'disabled:cursor-not-allowed disabled:opacity-60'
)

export const categoryTreeSummaryClass = 'text-[0.78rem] text-muted'

export const categoryTreeListClass = 'flex flex-col'

export const categoryTreeNodeClass =
  'border-b border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] last:border-b-0'

export const categoryTreeNodeButtonClass = cn(
  'flex w-full items-center gap-2 py-2.5 text-right',
  'transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-accent-soft)]'
)

export const categoryTreeChevronClass = (open: boolean) =>
  cn(
    'flex h-5 w-5 shrink-0 items-center justify-center text-muted',
    'transition-transform duration-[var(--duration-fast)]',
    open && 'rotate-180'
  )

export const categoryTreeNodeLabelClass = 'min-w-0 flex-1 truncate text-[0.88rem] font-semibold'

export const categoryTreeCountClass =
  'shrink-0 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[0.7rem] text-muted'

export const categoryTreeChildListClass =
  'mb-1.5 mr-[1.6rem] border-r-2 border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] pr-3'

export const categoryTreeChildRowClass = 'flex items-center gap-2 py-1.5'

export const categoryTreeChildLabelClass = 'min-w-0 flex-1 truncate text-[0.82rem] text-muted'

export const categoryTreeTypeBadgeClass = (type: 'income' | 'expense') =>
  cn(
    'shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold',
    type === 'income'
      ? 'bg-[color-mix(in_srgb,var(--color-income)_16%,transparent)] text-income'
      : 'bg-[color-mix(in_srgb,var(--color-expense)_16%,transparent)] text-expense'
  )
