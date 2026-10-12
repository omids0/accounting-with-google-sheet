import { cn, cx } from '../../utils/cn'

/** «دسته‌ها» (round 6, D1): flat rows on the page background, like the calm blocks. */
export const categoryPageClass = 'flex w-full flex-col gap-3'

export const categoryToolbarClass = 'flex flex-col gap-2'

/** Search and «دسته جدید»: stacked full width on phones, one row from tablets up. */
export const categorySearchAddClass = cx(
  'flex flex-col gap-2 md:flex-row md:items-center',
  '[&_.page-search]:max-w-none md:[&_.page-search]:max-w-[20rem]'
)

/** «بدهی · طلب · یادآوری» under «سایر فهرست‌ها». */
export const categorySubSegmentClass =
  'mb-0 [&_button]:flex-none [&_button]:px-3 [&_button]:py-[0.35rem] [&_button]:text-[0.74rem]'

export const categoryListClass = 'm-0 flex list-none flex-col p-0'

export function categoryRowClass(dimmed?: boolean, dragOver?: boolean) {
  return cn(
    'flex min-h-14 items-center gap-1.5 border-t border-border py-1.5 first:border-t-0',
    dimmed && 'opacity-60',
    dragOver && 'bg-accent-soft'
  )
}

export const categoryRowButtonClass = cx(
  'focus-ring-inset flex min-h-touch-min min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md',
  'border-0 bg-transparent px-1 py-1 text-start text-inherit hover:bg-accent-soft'
)

export const categoryRowMainClass = 'min-w-0 flex-1'

export const categoryRowTitleClass =
  'flex min-w-0 items-center gap-1.5 truncate text-[0.88rem] font-semibold text-text'

export const categoryRowMetaClass = 'mt-0.5 block truncate text-[0.72rem] text-muted'

export const categoryRowHintClass = 'font-semibold text-primary-dark'

export const categoryBadgeClass = cx(
  'inline-flex shrink-0 items-center rounded-full px-2 py-px text-[0.64rem] font-bold',
  'bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)] text-muted'
)

/** `chevron-down` turned to point forward (left in RTL). */
export const categoryChevronClass = 'shrink-0 rotate-90 text-muted'

export const categoryAddRowClass =
  'flex min-w-0 flex-1 items-center gap-2 [&>input]:min-w-0 [&>input]:flex-1'

/** The one-time «دسته‌های پیشنهادی» row at the top of the page. */
export const categoryOfferClass = cx(
  'flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5',
  'text-[0.8rem] leading-relaxed text-text'
)

export const categoryOfferActionsClass = 'flex flex-wrap items-center gap-2'

/** Rows of the detail sheet: a label, its value and an edit control. */
export const categorySheetRowClass =
  'flex min-h-touch-min items-center gap-2 border-b border-border py-1.5 last:border-b-0'

export const categorySheetLabelClass = 'min-w-0 flex-1 text-[0.84rem] font-semibold text-text'

export const categorySheetValueClass = 'shrink-0 text-[0.84rem] text-muted'

export const categorySubListClass = 'm-0 flex list-none flex-col p-0'

export const categorySubRowClass =
  'flex min-h-touch-min items-center gap-1 border-b border-border py-1 last:border-b-0 [&>input]:min-w-0 [&>input]:flex-1'

export const categorySubNameClass = 'min-w-0 flex-1 truncate text-[0.84rem] text-text'

export const categoryIconBtnClass = cx(
  'inline-flex h-touch-min w-touch-min shrink-0 cursor-pointer items-center justify-center rounded-sm',
  'border-none bg-transparent p-0 text-muted hover:enabled:bg-accent-soft hover:enabled:text-primary-dark',
  'disabled:cursor-not-allowed disabled:opacity-45'
)

export const categorySheetActionsClass = 'mt-1 flex flex-wrap items-center gap-2'

export const categoryProgressClass = 'flex flex-col gap-1 text-[0.78rem] text-muted'
