import { cx } from '../../utils/cn'

/** «این رکورد هم‌زمان عوض شده» (round 8, edit conflicts). */
export const conflictTextClass = 'm-0 text-[0.82rem] leading-relaxed text-muted'

export const conflictNoteClass = 'm-0 text-[0.72rem] leading-relaxed text-muted'

export const conflictDiffHeadClass = 'm-0 text-[0.78rem] text-muted'

export const conflictDiffClass = cx(
  'w-full border-collapse text-[0.78rem]',
  '[&_td]:border-t [&_td]:border-border [&_td]:px-1.5 [&_td]:py-1.5 [&_td]:align-top',
  '[&_th]:border-t [&_th]:border-border [&_th]:px-1.5 [&_th]:py-1.5 [&_th]:text-start',
  '[&_thead_th]:border-t-0 [&_thead_th]:text-[0.7rem] [&_thead_th]:text-muted'
)
