import { cx } from '../../utils/cn'

export const invitePageClass = cx('flex flex-col pb-4', 'md:max-w-4xl md:mx-auto md:w-full')

export const inviteTextClass = 'mb-3 text-[0.85rem] leading-[1.9] text-[var(--color-text-muted)]'

/** A link or code is Latin text inside a right-to-left page, so it gets its own isolated direction. */
export const inviteLinkBoxClass = cx(
  'min-h-[3.75rem]',
  'mb-3 select-all break-all rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2',
  'text-start font-mono text-[0.8rem] leading-[1.7] [direction:ltr] [unicode-bidi:isolate]'
)

export const inviteActionsClass = 'flex flex-wrap gap-2'

export const inviteActionClass = 'min-h-11 text-sm'

export const inviteCountClass =
  'text-[1.9rem] font-bold leading-tight text-[var(--color-primary-dark)]'

/** The loading and the ready body take the same height, so the page does not jump. */
export const inviteStatsBodyClass = 'min-h-[6.5rem]'
