import { cx } from '../../utils/cn'

/** «پرتکرارها»: a flat section above the entry card, chips scroll sideways. */
export const entryTemplatesClass = 'mb-3'

export const entryTemplatesHeadClass =
  'mb-1.5 flex items-center justify-between px-1 text-[0.8rem] font-bold text-muted'

export const entryTemplatesLinkClass = cx(
  'min-h-touch-min cursor-pointer rounded-[var(--radius-sm)] border-none bg-transparent px-2',
  'text-[0.8rem] font-semibold text-primary hover:underline'
)

export const entryTemplatesRowClass =
  '-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export const entryTemplateChipClass = cx(
  'flex min-h-touch-min max-w-[11rem] shrink-0 cursor-pointer flex-col items-start justify-center gap-0.5',
  'rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 text-start',
  'transition-[border-color,background] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  'hover:border-primary active:bg-bg'
)

export const entryTemplateChipLabelClass =
  'max-w-full truncate text-[0.8rem] font-semibold leading-tight text-text'

export const entryTemplateChipMetaClass =
  'max-w-full truncate text-[0.7rem] leading-tight text-muted'

/** One row of the pin/hide sheet. */
export const entryTemplateEditRowClass =
  'flex items-center gap-2 border-b border-border py-2 last:border-b-0'

export const entryTemplateEditTextClass = 'min-w-0 flex-1'

/** Duplicate warning under the amount (never blocks the save). */
export const entryDuplicateActionsClass = 'mt-2 flex flex-wrap items-center gap-2'

export const entryDuplicateLinkClass = cx(
  'min-h-touch-min cursor-pointer border-none bg-transparent px-2 text-[0.8rem] font-semibold',
  'text-muted hover:text-text'
)

/** A pinned chip keeps a primary outline. */
export const entryTemplateChipPinnedClass = 'border-primary'
