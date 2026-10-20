import { cn, cx } from '../../utils/cn'

/** Round 11: the step bar of the setup journey, shown under a sheet's title bar. */
export const journeyBarClass = cx(
  'flex flex-shrink-0 flex-col gap-1.5 border-b border-border px-[1.15rem] pb-3 pt-2.5'
)

export const journeyBarRowClass = 'flex items-center justify-between gap-2'

export const journeyBarCountClass = 'text-[0.85rem] font-extrabold text-text'

export const journeyBarPillClass =
  'rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface))] px-2.5 py-0.5 text-[0.75rem] font-bold text-primary'

export const journeyBarLinkClass =
  'text-[0.8rem] font-bold text-muted underline underline-offset-4 hover:text-primary'

export const journeyBarSegmentsClass = 'flex gap-1'

/** A page-level block of the journey (steps 1 and 2 run before the building exists). */
export const journeyPageClass = 'mx-auto flex w-full max-w-[34rem] flex-col gap-4'

export const journeyNoteClass = 'text-[0.78rem] leading-[1.8] text-muted'

export const journeyListClass = 'flex flex-col gap-2'

export const journeyRowClass = cx(
  'flex w-full items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5 text-start'
)

export const journeyRowButtonClass = cx(
  journeyRowClass,
  'cursor-pointer hover:border-primary focus-visible:border-primary'
)

export const journeyRowTitleClass = 'text-[0.9rem] font-bold text-text'

export const journeyRowMetaClass = 'text-[0.76rem] leading-[1.6] text-muted'

export const journeyTotalClass =
  'flex items-center justify-between gap-2 text-[0.85rem] font-bold text-text'

export const journeyProgressTextClass = 'flex justify-between text-[0.8rem] text-muted'

/** Cards of the «مدیر ساختمان» home. */
export const buildingCardClass = 'flex flex-col gap-3'

export const buildingCardHeadClass = 'flex items-start justify-between gap-3'

export const buildingCardTitleClass = 'text-[1rem] font-extrabold text-text'

export const buildingTilesClass = 'grid gap-2 sm:grid-cols-3'

export function buildingTileClass(warn = false) {
  return cn(
    'flex min-w-0 flex-col gap-0.5 rounded-[12px] border px-3 py-2 text-[0.8rem] leading-[1.6]',
    warn
      ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      : 'border-border bg-bg text-text'
  )
}

export const buildingTileValueClass = 'font-bold tabular-nums'

export const buildingChipClass =
  'rounded-full border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-2 py-0.5 text-[0.7rem] font-bold text-[var(--color-warning)]'

export const checklistRowClass = 'flex items-center gap-2 text-[0.82rem] text-text'
