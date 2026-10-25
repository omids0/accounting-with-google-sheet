import { cx } from '../../utils/cn'

/** «جستجو ⌕» in the desktop header: a translucent pill that reads as a field. */
export const headerSearchChipClass = cx(
  'hidden h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border-0 px-3.5 xl:ms-auto xl:inline-flex',
  'bg-white/15 text-[0.8rem] font-semibold text-white ring-1 ring-white/20 transition-[background] hover:bg-white/25'
)

export const headerSearchKbdClass =
  'rounded-md bg-black/15 px-1.5 py-px font-numeric text-[0.66rem] font-bold text-white/85'

export const searchPageClass = 'mx-auto flex w-full max-w-3xl flex-col gap-3 pb-6'

// The shared field caps at 220px for toolbars; here it is the page's main control.
export const searchBarClass = 'flex pt-1 [&_.page-search]:max-w-none [&_input]:text-[0.92rem]'

export const searchChipsClass =
  '-mx-1 overflow-x-auto px-1 pb-0.5 [&>div]:flex-nowrap [&_button]:shrink-0 [&_button]:whitespace-nowrap'

export const searchSuggestChipsClass = 'flex flex-wrap gap-[0.45rem]'

export const searchSuggestChipClass = cx(
  'inline-flex min-h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3',
  'text-[0.78rem] font-semibold text-text hover:border-primary'
)

export const searchRowButtonClass = cx(
  'focus-ring-inset flex min-h-12 w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-0.5 py-2',
  'text-start text-inherit hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]'
)

/** Leading badge of a row without a date: the module's short label. */
export const searchRowTagClass = cx(
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[0.62rem] font-bold text-text',
  'bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]'
)

export const searchAmountNegativeClass =
  'text-[color-mix(in_srgb,var(--color-danger)_80%,var(--color-text))]'
