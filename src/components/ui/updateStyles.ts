import { cx } from '../../utils/cn'

/** One bar under the header: text on one side, «به‌روزرسانی» / «بعداً» on the other. */
export const updateBannerClass = cx(
  'mx-[var(--space-page)] mt-[var(--space-page)] flex items-center gap-3',
  'rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-[0.8rem] leading-relaxed text-text',
  'shadow-[0_4px_16px_rgba(15,23,42,0.08)] animate-[slideDown_var(--duration-normal)_var(--ease-out)]',
  'motion-reduce:animate-none'
)

export const updateBannerTextClass = 'min-w-0 flex-1 [&_b]:block [&_b]:text-[0.86rem]'

export const updateBannerNoteClass = 'text-muted'

export const updateBannerActionsClass = 'flex flex-none flex-wrap items-center justify-end gap-1'

/** «چه خبر؟»: up to three lines, each a title with a muted detail under it. */
export const whatsNewListClass = 'm-0 flex list-none flex-col gap-3 p-0'

export const whatsNewItemClass = cx(
  'flex items-start gap-2.5 text-[0.9rem] font-semibold leading-snug text-text',
  '[&_small]:mt-0.5 [&_small]:block [&_small]:text-[0.8rem] [&_small]:font-normal [&_small]:text-muted'
)

export const whatsNewMarkClass = 'mt-0.5 flex-none text-[var(--color-warning)]'
