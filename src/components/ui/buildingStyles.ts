import { calmDayBadgeClass } from './calmListStyles'
import { cn, cx } from '../../utils/cn'

/** Round 11: the step bar of the setup journey, shown under a sheet's title bar. */
export const journeyBarClass = cx(
  'flex flex-shrink-0 flex-col gap-1.5 border-b border-border px-[1.15rem] pb-3 pt-2.5'
)

export const journeyBarRowClass = 'flex items-center justify-between gap-2'

export const journeyBarCountClass = 'text-sm font-extrabold text-text'

export const journeyBarPillClass =
  'rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))] px-2.5 py-0.5 text-sm font-bold text-primary'

export const journeyBarLinkClass =
  'inline-flex min-h-11 items-center px-1 text-sm font-bold text-muted underline underline-offset-4 hover:text-primary'

export const journeyBarSegmentsClass = 'flex gap-1'

/** A page-level block of the journey (steps 1 and 2 run before the building exists). */
export const journeyPageClass = 'mx-auto flex w-full max-w-[34rem] flex-col gap-4'

export const journeyNoteClass = 'text-sm leading-[1.8] text-muted'

export const journeyListClass = 'flex flex-col gap-2'

export const journeyRowClass = cx(
  'flex w-full items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5 text-start'
)

export const journeyRowButtonClass = cx(
  journeyRowClass,
  'cursor-pointer hover:border-primary focus-visible:border-primary'
)

export const journeyRowTitleClass = 'text-[0.9rem] font-bold text-text'

export const journeyRowMetaClass = 'text-sm leading-[1.6] text-muted'

export const journeyTotalClass =
  'flex items-center justify-between gap-2 text-sm font-bold text-text'

export const journeyProgressTextClass = 'flex justify-between text-sm text-muted'

/** Cards of the «مدیر ساختمان» home. */
export const buildingCardClass = 'flex flex-col gap-3'

export const buildingCardHeadClass = 'flex items-start justify-between gap-3'

export const buildingCardTitleClass = 'text-[1rem] font-extrabold text-text'

export const buildingTilesClass = 'grid gap-2 sm:grid-cols-3'

export function buildingTileClass(warn = false) {
  return cn(
    'flex min-w-0 flex-col gap-0.5 rounded-[12px] border px-3 py-2 text-sm leading-[1.6]',
    warn
      ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      : 'border-border bg-bg text-text'
  )
}

export const buildingTileValueClass = 'font-bold tabular-nums'

export const buildingChipClass =
  'rounded-full border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-2 py-0.5 text-sm font-bold text-[var(--color-warning)]'

export const checklistRowClass = 'flex items-center gap-2 text-sm text-text'

/*
 * The calm list classes are tuned for the denser personal dashboard (12-13px). Building rows carry
 * debts, balances and due dates for readers on a phone, so they read at 14px and wrap instead of
 * being cut off.
 */
export const buildingRowTitleClass = 'block truncate text-sm font-semibold text-text'

export const buildingRowSubClass = 'mt-0.5 block text-sm text-muted'

export const buildingRowEndClass =
  'shrink-0 whitespace-nowrap font-numeric text-sm font-bold tabular-nums text-text'

export const buildingNoteClass = 'm-0 mt-1 px-0.5 text-sm leading-relaxed text-muted'

export const buildingEmptyClass = 'm-0 py-3 text-center text-sm text-muted'

/** The unit-number badge: the calm day badge, a size up so the number reads. */
export const buildingDayBadgeClass = cn(calmDayBadgeClass, 'h-10 w-10 text-sm')

/** A text link with a 44px touch target («بایگانی‌شده ▾», «بازگردانی»). */
export const buildingLinkClass = cx(
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-md border-none bg-transparent px-2',
  'text-sm font-semibold text-primary-dark hover:underline'
)

/** The «⋯» button of a row: icon only, so it needs its own `aria-label`. */
export const buildingMoreButtonClass =
  'h-11 w-11 shrink-0 cursor-pointer rounded-md border-0 bg-transparent text-muted'

/** For a `CalmBlock` in a building: a bigger title and a 44px «همه ›» link in its header row. */
export const buildingBlockClass =
  '[&_h2]:text-base [&>div:first-child]:min-h-11 [&>div:first-child_button]:min-h-11 [&>div:first-child_button]:text-sm [&_h2_span]:text-sm'
