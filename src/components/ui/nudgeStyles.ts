import { cx } from '../../utils/cn'

/** «ذخیره شد» on top, the suggestion card right under it. */
export const nudgeStackClass = 'flex w-[min(92vw,24rem)] flex-col gap-2'

/** Matches the success toast it replaces. */
export const nudgeSavedClass =
  'rounded-[var(--radius-sm)] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-center text-[0.85rem] text-success'

export const nudgeCardClass = cx(
  'rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-[0.8rem] leading-relaxed text-text',
  'shadow-[0_8px_28px_rgba(0,0,0,0.18)] [&_b]:block [&_b]:text-[0.86rem]'
)

export const nudgeActionsClass = 'mt-2 flex flex-wrap items-center gap-2'

export const nudgeLinkClass =
  'min-h-touch-min cursor-pointer border-none bg-transparent px-2 text-[0.8rem] text-muted hover:text-text'
