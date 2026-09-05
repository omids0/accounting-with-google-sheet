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

export const activeFilterChipsClass = 'mb-[0.65rem] flex flex-wrap gap-[0.4rem]'

export const activeFilterChipClass = cn(
  'inline-flex max-w-full min-h-[1.65rem] items-center gap-[0.12rem] rounded-full border border-[color-mix(in_srgb,var(--color-primary)_20%,var(--color-border))] py-[0.12rem] pe-[0.35rem] ps-[0.12rem] text-[0.72rem] font-semibold leading-[1.2] text-primary-dark shadow-[0_1px_4px_rgba(15,23,42,0.05)]',
  '[background:linear-gradient(145deg,color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))_0%,var(--color-surface)_100%)]'
)

export function activeFilterChipMainClass(clickable?: boolean) {
  return cn(
    'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent px-[0.35rem] py-[0.12rem] text-start font-[inherit] leading-[inherit] text-inherit',
    clickable
      ? 'cursor-pointer rounded-full transition-[background] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-px focus-visible:outline-[color-mix(in_srgb,var(--color-primary)_45%,transparent)]'
      : 'cursor-default px-[0.45rem]'
  )
}

export const activeFilterChipRemoveClass = cn(
  'flex h-[1.15rem] w-[1.15rem] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary transition-[background] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  'hover:bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-px focus-visible:outline-[color-mix(in_srgb,var(--color-primary)_45%,transparent)]'
)

export const pageSearchClass = 'page-search relative min-w-0 max-w-[220px] flex-1'

export const pageSearchIconClass =
  'pointer-events-none absolute end-[0.7rem] top-1/2 flex -translate-y-1/2 items-center justify-center text-muted opacity-70'

export const pageSearchInputClass = cn(
  'page-search-input w-full rounded-full border-[1.5px] border-border px-[2.1rem] py-2 font-[inherit] text-[0.82rem] text-text shadow-[0_2px_10px_rgba(15,118,110,0.06)] transition-[border-color,box-shadow,background,transform] duration-[var(--duration-normal)]',
  '[background:linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.92))] placeholder:text-muted placeholder:opacity-75',
  'focus:border-primary-light focus:bg-surface focus:shadow-[0_0_0_3px_rgba(20,184,166,0.14),0_4px_16px_rgba(15,118,110,0.1)] focus:outline-none focus:-translate-y-px'
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
  'm-0 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-[0.15rem] text-start text-[0.72rem] leading-[1.35] text-muted'

export const pageFilterBarCollapseInnerClass =
  'border-t border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_3%,var(--color-surface))]'

export function pageFilterBtnClass({ active, applied }: { active?: boolean; applied?: boolean }) {
  return cn(
    'relative flex h-[2.35rem] w-[2.35rem] shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] text-primary shadow-[0_2px_8px_rgba(15,23,42,0.07)] transition-[background,border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-spring)]',
    '[background:linear-gradient(145deg,var(--color-surface)_0%,color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))_100%)]',
    'hover:border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] active:scale-[0.94]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--color-primary)_45%,transparent)]',
    active &&
      'border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))] shadow-[0_3px_10px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]',
    applied &&
      'after:absolute after:top-[0.3rem] after:end-[0.3rem] after:h-[0.42rem] after:w-[0.42rem] after:rounded-full after:bg-primary after:shadow-[0_0_0_2px_var(--color-surface)] after:content-[""]'
  )
}
