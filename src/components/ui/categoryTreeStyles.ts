import type { CSSProperties } from 'react'

import { cn } from '../../utils/cn'

export type CategoryTreeTone = 'income' | 'expense'

function toneVar(tone: CategoryTreeTone): string {
  return tone === 'income' ? 'var(--color-income)' : 'var(--color-expense)'
}

/** Tone colour as a CSS variable the section, row and bars all read from. */
export function categoryTreeToneStyle(tone: CategoryTreeTone): CSSProperties {
  return { '--tree-tone': toneVar(tone) } as CSSProperties
}

export const categoryTreeToolbarClass =
  'mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] pb-3'

export const categoryTreeToggleAllClass = cn(
  'inline-flex min-h-touch-min items-center gap-1.5 rounded-full px-3.5 py-1.5',
  'border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]',
  'bg-[color-mix(in_srgb,var(--color-accent-soft)_55%,var(--color-surface))]',
  'text-[0.78rem] font-bold text-[var(--color-primary-dark)]',
  'transition-[background-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  'hover:bg-[var(--color-accent-soft)] hover:shadow-[var(--shadow)] active:scale-[0.97]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none'
)

export const categoryTreeToggleIconClass = (expanded: boolean) =>
  cn(
    'flex items-center transition-transform duration-[var(--duration-normal)] ease-[var(--ease-spring)]',
    expanded && 'rotate-180'
  )

export const categoryTreeCaptionClass = 'numeric text-[0.76rem] leading-none text-muted'

export const categoryTreeSectionClass = 'mt-3 first:mt-1'

export const categoryTreeSectionHeaderClass =
  'mb-1.5 flex items-baseline gap-2 px-1 text-[var(--tree-tone)]'

export const categoryTreeSectionTitleClass = 'text-[0.8rem] font-extrabold'

export const categoryTreeSectionCountClass = 'numeric text-[0.7rem] font-semibold opacity-70'

export const categoryTreeSectionRuleClass =
  'h-px flex-1 bg-[color-mix(in_srgb,var(--tree-tone)_22%,transparent)]'

export const categoryTreeSectionTotalClass = 'numeric text-[0.76rem] font-bold'

export const categoryTreeListClass = 'flex flex-col gap-0.5'

export const categoryTreeNodeClass = (open: boolean) =>
  cn(
    'overflow-hidden rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-fast)]',
    open
      ? 'bg-[color-mix(in_srgb,var(--tree-tone)_7%,transparent)]'
      : 'hover:bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,transparent)]'
  )

export const categoryTreeRowClass = cn(
  'relative grid w-full grid-cols-[1.75rem_1fr_auto] items-center gap-x-2 gap-y-1 px-2 py-2 text-right',
  'before:absolute before:inset-y-1.5 before:right-0 before:w-[3px] before:rounded-full',
  'before:bg-[var(--tree-tone)] before:opacity-0 before:transition-opacity before:content-[""]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
  'data-[open=true]:before:opacity-100'
)

export const categoryTreeChevronClass = (open: boolean) =>
  cn(
    'flex h-7 w-7 items-center justify-center rounded-full',
    'bg-[color-mix(in_srgb,var(--tree-tone)_12%,transparent)] text-[var(--tree-tone)]',
    'transition-transform duration-[var(--duration-normal)] ease-[var(--ease-spring)]',
    open && 'rotate-180'
  )

/** Leaf rows keep the chevron column so every name starts on the same line. */
export const categoryTreeLeafDotClass = cn(
  'flex h-7 w-7 items-center justify-center',
  'before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--tree-tone)] before:opacity-45 before:content-[""]'
)

export const categoryTreeHeadingRowClass = 'flex min-w-0 items-center gap-1.5'

export const categoryTreeNameClass = 'min-w-0 truncate text-[0.88rem] font-bold'

export const categoryTreeCountClass = cn(
  'numeric shrink-0 rounded-full px-1.5 py-px text-[0.66rem] font-semibold text-muted',
  'bg-[color-mix(in_srgb,var(--color-border)_45%,transparent)]'
)

export const categoryTreeBarRowClass = 'col-span-2 col-start-2 flex items-center gap-2'

export const categoryTreeTrackClass = cn(
  'relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full',
  'bg-[color-mix(in_srgb,var(--tree-tone)_13%,transparent)]'
)

export const categoryTreeFillClass = (subtle = false) =>
  cn(
    'absolute inset-y-0 start-0 rounded-full bg-[var(--tree-tone)]',
    'transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)] motion-reduce:transition-none',
    subtle && 'opacity-45'
  )

export const categoryTreeShareLabelClass = (subtle = false) =>
  cn(
    'numeric w-[2.75rem] shrink-0 text-left text-[0.72rem] font-semibold',
    subtle ? 'text-muted' : 'text-[var(--tree-tone)]'
  )

export const categoryTreeAmountClass = 'shrink-0'

/** Children hang off a rail on the start side, which is the right in RTL. */
export const categoryTreeChildListClass = cn(
  'relative mb-1.5 me-2.5 ms-2 pe-[1.15rem] ps-1',
  'before:absolute before:inset-y-1 before:right-[0.4rem] before:w-px before:content-[""]',
  'before:bg-[color-mix(in_srgb,var(--tree-tone)_28%,transparent)]'
)

export const categoryTreeChildRowClass = cn(
  'relative grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 rounded-[var(--radius-sm)] px-2 py-1.5',
  'before:absolute before:right-[-0.75rem] before:top-[1.1rem] before:h-px before:w-[0.55rem] before:content-[""]',
  'before:bg-[color-mix(in_srgb,var(--tree-tone)_28%,transparent)]',
  'animate-[fadeInUp_0.3s_var(--ease-page)_both] motion-reduce:animate-none'
)

export const categoryTreeChildNameClass =
  'flex min-w-0 items-center gap-1.5 text-[0.82rem] text-[var(--color-text)]'

export const categoryTreeChildBarRowClass = 'col-span-2 flex items-center gap-2'

export const categoryTreeEmptyClass =
  'flex flex-col items-center gap-2 py-10 text-center text-[0.85rem] text-muted'

export const categoryTreeEmptyIconClass = cn(
  'flex h-12 w-12 items-center justify-center rounded-full',
  'bg-[color-mix(in_srgb,var(--color-accent-soft)_70%,transparent)] text-[var(--color-primary)]'
)
