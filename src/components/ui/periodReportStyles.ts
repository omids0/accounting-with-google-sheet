import { cn, cx } from '../../utils/cn'

/** Round 7: the monthly report preview and the «سال در یک نگاه» card. */

export const periodReportPickerClass = 'flex flex-wrap items-center justify-between gap-3'

export const periodReportPickerLabelClass = 'text-[0.88rem] font-bold text-text'

export const periodReportSheetClass = 'flex flex-col gap-3'

export const periodReportHeadClass = cx(
  'flex items-baseline justify-between gap-3 border-b-2 border-primary pb-2'
)

export const periodReportTitleClass = 'text-[1rem] font-extrabold text-primary'

export const periodReportOwnerClass = 'truncate text-[0.8rem] text-muted'

export const periodReportStatsClass = 'grid grid-cols-3 gap-2'

export const periodReportStatClass = cx(
  'flex flex-col items-center gap-1 rounded-[12px] border border-border px-2 py-3 text-center',
  'text-[0.75rem] text-muted'
)

export const periodReportStatValueClass = 'text-[0.95rem] font-extrabold text-text'

export const periodReportSectionClass = 'text-[0.85rem] font-bold text-text'

export function periodReportBudgetClass(over: boolean) {
  return cn('flex flex-col gap-1 text-[0.8rem]', over ? 'text-danger' : 'text-text')
}

export const periodReportTrackClass = 'h-2 overflow-hidden rounded-full bg-border'

export function periodReportFillClass(over: boolean) {
  return cn(
    'h-full rounded-full',
    over ? 'bg-danger' : 'bg-[color-mix(in_srgb,var(--color-text)_42%,transparent)]'
  )
}

export const periodReportFactsClass = cx(
  'border-t border-dashed border-border pt-2 text-[0.8rem] leading-[2] text-text'
)

export const periodReportActionsClass = 'flex flex-wrap items-center gap-2'

export const periodReportLinkClass = cx(
  'px-2 py-1.5 text-[0.8rem] font-bold text-primary underline-offset-4 hover:underline',
  'disabled:cursor-not-allowed disabled:opacity-60'
)

export const periodReportEmptyClass = 'text-[0.85rem] text-muted'

export const yearCardClass = cx(
  'flex flex-col gap-3 border-[1.5px]',
  'border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]',
  'bg-[color-mix(in_srgb,var(--color-accent-soft)_55%,var(--color-surface))]'
)

export const yearCardKickerClass = 'text-[0.75rem] text-muted'

export const yearCardTitleClass = 'text-[1.25rem] font-extrabold text-text'

export const yearCardGridClass = 'grid grid-cols-3 gap-x-2 gap-y-3'

export const yearCardCellClass = 'flex min-w-0 flex-col gap-0.5 text-[0.72rem] text-muted'

export const yearCardCellValueClass =
  'text-[0.95rem] font-extrabold text-text [overflow-wrap:anywhere]'

export const yearCardFactsClass = 'text-[0.78rem] leading-[1.9] text-text'

export const yearListClass = 'flex flex-col gap-4'
