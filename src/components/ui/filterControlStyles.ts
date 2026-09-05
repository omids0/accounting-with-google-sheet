import { cn } from '../../utils/cn'

export const pageFilterPanelClass = 'flex flex-col gap-[0.7rem]'

export const pageFilterPanelSearchClass = 'm-0 [&_.page-search]:max-w-none'

export const pageFilterPanelSectionsClass = cn(
  'flex flex-col gap-[0.65rem]',
  '[&_.records-filter-section]:m-0 [&_.records-filter-section]:border-0 [&_.records-filter-section]:p-0',
  '[&_.records-filter-section+_.records-filter-section]:mt-0 [&_.records-filter-section+_.records-filter-section]:border-t [&_.records-filter-section+_.records-filter-section]:border-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-border))] [&_.records-filter-section+_.records-filter-section]:pt-[0.65rem]',
  '[&_.records-filter-section+_.records-custom-range]:mt-0 [&_.records-filter-section+_.records-custom-range]:border-t [&_.records-filter-section+_.records-custom-range]:border-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-border))] [&_.records-filter-section+_.records-custom-range]:pt-[0.65rem]',
  '[&_.records-custom-range+_.records-filter-section]:mt-0 [&_.records-custom-range+_.records-filter-section]:border-t [&_.records-custom-range+_.records-filter-section]:border-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-border))] [&_.records-custom-range+_.records-filter-section]:pt-[0.65rem]'
)

export const pageFilterPanelSearchInputClass =
  '[&_.page-search-input]:border-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))] [&_.page-search-input]:bg-surface [&_.page-search-input]:py-[0.58rem] [&_.page-search-input]:text-[0.84rem]'

export const filterModalPanelClass = 'max-h-[min(88vh,720px)]'

export const filterModalBodyClass = 'overflow-y-auto [&_.page-filter-panel]:gap-3'

export const filterModalActionsClass = 'justify-end gap-2'

export const filterModalClearClass = 'me-auto'

export const activeFilterBarClass = cn(
  'active-filter-chips mb-[0.7rem] flex flex-wrap items-center gap-2',
  '[&_[role=listitem]]:list-none'
)

export const activeFilterTriggerClass = (active?: boolean) =>
  cn(
    'inline-flex min-h-touch-min shrink-0 items-center gap-[0.35rem] rounded-full border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))] bg-surface px-3 py-2 font-[inherit] text-[0.8rem] font-bold text-primary-dark shadow-[0_1px_4px_rgba(15,23,42,0.05)] transition-[background,border-color,box-shadow,transform] duration-[var(--duration-fast)]',
    'hover:enabled:border-primary-light hover:enabled:bg-accent-soft active:enabled:scale-[0.97]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2',
    active &&
      'border-[color-mix(in_srgb,var(--color-primary)_36%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]'
  )

export const activeFilterTriggerLabelClass = 'leading-none'

export const activeFilterTriggerDotClass = cn(
  'inline-flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-primary px-[0.3rem] text-[0.62rem] font-extrabold leading-none text-white'
)

export const activeFilterClearAllClass = cn(
  'inline-flex min-h-touch-min shrink-0 items-center rounded-full border border-dashed border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_5%,var(--color-surface))] px-3 py-2 font-[inherit] text-[0.76rem] font-bold text-danger transition-[background,border-color] duration-[var(--duration-fast)]',
  'hover:enabled:border-danger hover:enabled:bg-[var(--color-danger-bg)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] focus-visible:ring-offset-2'
)

export const activeFilterChipsClass = activeFilterBarClass

export function activeFilterChipClass(kind: FilterChipKind = 'other') {
  return cn(
    'active-filter-chip inline-flex max-w-full min-h-touch-min items-center gap-[0.1rem] rounded-full border py-[0.15rem] pe-[0.35rem] ps-[0.15rem] text-[0.78rem] font-semibold leading-[1.2] text-primary-dark shadow-[0_1px_4px_rgba(15,23,42,0.05)]',
    '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))_0%,var(--color-surface)_100%)]',
    kind === 'sort' &&
      'border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] [background:linear-gradient(145deg,color-mix(in_srgb,var(--color-accent-soft)_80%,var(--color-surface))_0%,var(--color-surface)_100%)]',
    kind !== 'sort' && 'border-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border))]'
  )
}

export type FilterChipKind = 'search' | 'date' | 'category' | 'payment' | 'sort' | 'other'

export const activeFilterChipIconClass =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary'

export function activeFilterChipMainClass(clickable?: boolean) {
  return cn(
    'active-filter-chip__main flex min-w-0 max-w-[min(100%,14rem)] items-center gap-[0.3rem] overflow-hidden border-0 bg-transparent px-[0.25rem] py-[0.2rem] text-[0.78rem] font-semibold leading-[1.2] text-inherit',
    clickable
      ? 'active-filter-chip__main--clickable cursor-pointer rounded-full transition-[background] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2'
      : 'cursor-default px-[0.35rem]'
  )
}

export const activeFilterChipRemoveClass = cn(
  'active-filter-chip__remove flex h-touch-min w-touch-min shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary transition-[background] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  'hover:bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2'
)

export const pageSearchClass = 'page-search relative min-w-0 max-w-[220px] flex-1'

export const pageSearchIconClass =
  'pointer-events-none absolute end-[0.7rem] top-1/2 flex -translate-y-1/2 items-center justify-center text-muted opacity-70'

export const pageSearchInputClass = cn(
  'page-search-input w-full rounded-full border-[1.5px] border-border bg-[var(--form-input-bg)] px-[2.1rem] py-2 font-[inherit] text-[0.82rem] text-text shadow-[var(--form-input-shadow)] transition-[border-color,box-shadow,background,transform] duration-[var(--duration-normal)]',
  'placeholder:text-muted placeholder:opacity-75',
  'focus:border-primary-light focus:bg-surface focus:shadow-[var(--form-input-focus-shadow)] focus:outline-none focus:-translate-y-px'
)

export const pageFilterBarClass = cn(
  'relative mb-[0.65rem] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))] transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_4%,var(--color-surface))_0%,var(--color-surface)_55%)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_18px_color-mix(in_srgb,var(--color-primary)_7%,transparent)]'
)

export const pageFilterBarOpenClass =
  'border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] shadow-[0_2px_6px_rgba(15,23,42,0.05),0_10px_24px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]'

export const pageFilterBarRowClass =
  'flex min-h-[2.65rem] items-center justify-end gap-[0.55rem] px-[0.55rem] py-[0.45rem]'

export const pageFilterBarSummaryClass =
  'm-0 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-[0.15rem] text-start text-[0.75rem] leading-[1.35] text-muted'

export const pageFilterBarCollapseInnerClass =
  'border-t border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_3%,var(--color-surface))]'

export function pageFilterBtnClass({ active, applied }: { active?: boolean; applied?: boolean }) {
  return cn(
    'relative flex h-touch-min w-touch-min shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] text-primary shadow-[0_2px_8px_rgba(15,23,42,0.07)] transition-[background,border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
    '[background:linear-gradient(145deg,var(--color-surface)_0%,color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))_100%)]',
    'hover:border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] active:scale-[0.94]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--color-primary)_45%,transparent)]',
    active &&
      'border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))] shadow-[0_3px_10px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]',
    applied &&
      'after:absolute after:top-[0.3rem] after:end-[0.3rem] after:h-[0.42rem] after:w-[0.42rem] after:rounded-full after:bg-primary after:shadow-[0_0_0_2px_var(--color-surface)] after:content-[""]'
  )
}
