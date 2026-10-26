import { cx } from '../../utils/cn'

/** The shared account's pages («حساب مشترک»): home, records and settle. */
export const sharedPageClass = 'mx-auto flex w-full max-w-3xl flex-col gap-3 pb-6'

export const sharedCardHeadClass = 'flex items-center justify-between gap-2'

export const sharedCardTitleClass = 'm-0 text-[0.95rem] font-bold text-text'

export const sharedMutedClass = 'm-0 text-[0.78rem] leading-[1.7] text-muted'

/** The hero sentence («شما به مینا بدهکارید») under the amount, or alone when settled. */
export const sharedHeadlineClass = 'relative z-[1] m-0 mt-1 text-[1rem] font-bold text-white'

export const sharedHeroButtonClass = 'relative z-[1] mt-3 min-h-11'

/** Who paid how much of the month: one track, one part per person. */
export const sharedBarClass =
  'mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-accent-soft)]'

/** Person 1 (the owner) and person 2 (the partner): the same two colours on the bar and dots. */
export function sharedPersonFillClass(index: number): string {
  return index ? 'bg-primary-light' : 'bg-primary'
}

export const sharedLegendClass = 'mt-2 flex flex-col gap-1.5'

export const sharedLegendRowClass = 'flex items-center gap-2 text-[0.85rem] text-text'

export function sharedLegendDotClass(index: number): string {
  return cx('inline-block size-2.5 shrink-0 rounded-full', sharedPersonFillClass(index))
}

export const sharedListClass = 'mt-2 flex flex-col'

export const sharedAmountClass = 'numeric shrink-0 text-[0.9rem] font-bold text-text'

/** An `alertClassName` note inside a sheet: it must not shrink in the scrolling sheet body. */
export const sharedAlertClass = 'mb-[var(--form-gap)] shrink-0 last:mb-0'

/** The lock note of the record sheet and the viewer banner. */
export const sharedNoteRowClass = 'flex items-start gap-2'
