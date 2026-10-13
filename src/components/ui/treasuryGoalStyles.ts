import { cx } from '../../utils/cn'

/** Savings goal cards in «صندوقچه» (round 6, Task B3). */
export const goalCardClass = 'flex flex-col gap-2 p-4'

export const goalCardHeadClass = 'flex min-w-0 items-center gap-2'

export const goalBadgeClass = cx(
  'shrink-0 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5',
  'text-[0.68rem] font-semibold text-primary-dark'
)

export const goalCardLineClass =
  'm-0 font-numeric text-[0.85rem] font-semibold tabular-nums text-text'

export const goalCardPlanClass = 'm-0 text-[0.75rem] leading-relaxed text-muted'

export const goalCardActionsClass = 'mt-1 flex flex-wrap items-center gap-3'

export const goalLinkButtonClass = cx(
  'inline-flex min-h-9 cursor-pointer items-center rounded-md border-0 bg-transparent px-1.5',
  'text-[0.8rem] font-semibold text-primary-dark hover:underline'
)

export const goalSectionClass = 'mb-4 flex flex-col gap-3'

export const goalSectionFooterClass = 'flex flex-wrap items-center gap-2'

/** «برداشت» and «بایگانی» inside the edit form. */
export const goalFormExtraClass = 'flex flex-wrap gap-2 border-t border-border pt-3'
