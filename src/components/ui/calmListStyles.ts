import { cn, cx } from '../../utils/cn'

/**
 * Flat list blocks (round 5 «calm» dashboard and the charts page): no card, no
 * border box, no gradient — a small header and rows split by hairlines, sitting
 * straight on the page background in both themes.
 */
export const calmBlockClass = 'calm-block flex min-w-0 flex-col'

export const calmBlockHeadClass = 'flex min-h-9 items-center justify-between gap-2 px-0.5'

export const calmBlockTitleClass = 'm-0 text-[0.86rem] font-bold text-text'

export const calmBlockBadgeClass = 'ms-1 text-[0.72rem] font-medium text-danger'

export const calmBlockLinkClass = cx(
  'inline-flex min-h-8 shrink-0 cursor-pointer items-center rounded-md border-none bg-transparent px-1.5',
  'text-[0.74rem] font-semibold text-primary-dark hover:underline'
)

export const calmListClass = 'm-0 flex list-none flex-col p-0'

export const calmRowClass =
  'flex min-h-12 items-center gap-2.5 border-t border-border py-2 first:border-t-0'

export const calmRowMainClass = 'min-w-0 flex-1'

export const calmRowTitleClass = 'block truncate text-[0.82rem] font-semibold text-text'

export const calmRowSubClass = 'mt-0.5 block truncate text-[0.7rem] text-muted'

export const calmRowSubDangerClass = 'text-danger'

export const calmRowEndClass =
  'shrink-0 whitespace-nowrap font-numeric text-[0.8rem] font-bold tabular-nums text-text'

export const calmDayBadgeClass = cn(
  'flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[10px] leading-[1.15]',
  'bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] text-[0.76rem] font-bold text-text'
)

export const calmDayBadgeMonthClass = 'text-[0.58rem] font-medium'

/** Red toward the text color: darker on light, lighter on dark, ≥ 4.5:1 on the danger tint. */
export const calmDayBadgeDangerClass =
  'bg-[var(--color-danger-bg)] text-[color-mix(in_srgb,var(--color-danger)_80%,var(--color-text))]'

export const calmBarTrackClass =
  'mt-1.5 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-text)_9%,transparent)]'

export const calmBarClass =
  'h-full rounded-full origin-right transition-transform duration-700 ease-out motion-reduce:transition-none'

export const calmDotClass = 'h-2.5 w-2.5 shrink-0 rounded-full'

export const calmNoteClass = 'm-0 mt-1 px-0.5 text-[0.7rem] leading-relaxed text-muted'

export const calmEmptyClass = 'm-0 py-3 text-center text-[0.76rem] text-muted'

/** `TransactionTypeSegment` sized for a block header row (هزینه | درآمد, ماه | سال). */
export const calmSegmentClass =
  'mb-0 shrink-0 [&_button]:flex-none [&_button]:px-3.5 [&_button]:py-[0.4rem] [&_button]:text-[0.76rem]'

/** Charts reused on a flat page: drop their card box, keep their content. */
export const calmChartFlatClass =
  'border-0 !p-0 shadow-none [background:none] before:hidden [&.chart-card--animated]:animate-none'

/** A category row that opens its budget sheet: the whole name/bar column is the button. */
export const calmRowButtonClass = cx(
  'focus-ring-inset min-w-0 flex-1 cursor-pointer rounded-md border-0 bg-transparent p-0',
  'text-start text-inherit'
)

export const calmRowHeadClass = 'flex min-w-0 items-baseline gap-1.5'

/** «↑ ۳۰٪ از شهریور» next to a category name. */
export const calmCompareClass = 'shrink-0 whitespace-nowrap text-[0.68rem] font-semibold'

export const calmCompareToneClass = {
  bad: 'text-[color-mix(in_srgb,var(--color-danger)_80%,var(--color-text))]',
  good: 'text-[color-mix(in_srgb,var(--color-success)_80%,var(--color-text))]',
  same: 'text-muted'
} as const

/** Budget bar: grey up to 100%, red past it. */
export const calmBudgetBarColor = {
  within: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
  over: 'var(--color-danger)'
} as const

export const calmBudgetLinkClass = 'font-semibold text-primary-dark'
