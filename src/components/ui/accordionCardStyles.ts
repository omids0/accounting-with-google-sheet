import { cn } from '../../utils/cn'

/**
 * Header of a collapsible card section: icon, title, one-line summary and a
 * chevron. Shared by the About feature groups and the Settings sections.
 */
export const accordionCardTriggerClass = cn(
  'flex min-h-touch-min w-full cursor-pointer items-center gap-3 border-none bg-transparent p-4 py-[0.875rem] text-start text-inherit',
  'hover:[background:var(--color-surface-elevated,rgba(0,0,0,0.03))]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)]'
)

export const accordionCardIconClass = cn(
  'inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.625rem] text-primary',
  '[background:var(--color-surface-elevated,rgba(0,0,0,0.04))]'
)

export const accordionCardTextClass = 'flex min-w-0 flex-1 flex-col gap-[0.15rem]'

export const accordionCardTitleClass = 'text-[0.9375rem] font-bold leading-[1.4]'

export const accordionCardSummaryClass = 'text-xs leading-[1.5] text-muted'

export function accordionCardChevronClass(expanded?: boolean) {
  return cn(
    'inline-flex flex-shrink-0 text-muted transition-transform duration-[var(--duration-slow,0.25s)] ease-[var(--ease-out,ease)]',
    expanded && 'rotate-180'
  )
}
