import { cx } from '../../utils/cn'

/** «ثبت‌کننده» avatar on shared spreadsheets (round 8). */
const writerAvatarBaseClass = cx(
  'inline-flex size-[1.375rem] shrink-0 items-center justify-center rounded-full align-middle',
  'text-[0.625rem] font-bold leading-none'
)

/** Me: muted grey; others: the accent the savings goal badges use. */
export function writerAvatarClass(isMe: boolean): string {
  return cx(
    writerAvatarBaseClass,
    isMe
      ? 'bg-[color-mix(in_srgb,var(--color-text-muted)_22%,transparent)] text-text'
      : 'bg-[var(--color-accent-soft)] text-primary-dark ring-1 ring-[var(--color-accent-mid)]'
  )
}

export const writerTagClass = 'me-1 inline-flex items-center gap-1 align-middle'
