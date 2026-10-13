import { cn, cx } from '../../utils/cn'

/** «ریز اقلام» in the entry form: the dashed add row, the item list and the sum line. */
export const lineItemsAddRowClass = cx(
  'flex min-h-touch-min w-full cursor-pointer items-center justify-between gap-2 rounded-form',
  'border border-dashed border-border bg-transparent px-3.5 text-[0.9rem] font-semibold text-primary',
  'transition-[border-color,background] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  'hover:border-primary hover:bg-bg disabled:cursor-not-allowed disabled:opacity-60'
)

export const lineItemsHintClass = 'text-[0.75rem] font-normal text-muted'

export const lineItemsListClass = 'overflow-hidden rounded-form border border-border bg-surface'

export const lineItemRowClass = cx(
  'flex min-h-touch-min items-center gap-2 border-b border-border ps-3 pe-1 py-1.5 last:border-b-0'
)

export const lineItemMainClass = cx(
  'flex min-w-0 flex-1 cursor-pointer flex-col items-start justify-center gap-0.5',
  'border-none bg-transparent p-0 text-start disabled:cursor-not-allowed'
)

export const lineItemNameClass = 'max-w-full truncate text-[0.9rem] font-semibold text-text'

export const lineItemNoteClass = 'max-w-full truncate text-[0.75rem] text-muted'

export const lineItemAmountClass = 'numeric shrink-0 text-[0.88rem] font-semibold text-text'

export const lineItemRemoveClass = cx(
  'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none',
  'bg-transparent text-muted hover:enabled:text-danger disabled:cursor-not-allowed'
)

export const lineItemsAddMoreClass = cx(
  'flex min-h-touch-min w-full cursor-pointer items-center gap-1.5 border-none bg-transparent px-3',
  'text-[0.85rem] font-semibold text-primary hover:enabled:bg-bg disabled:cursor-not-allowed'
)

const sumBase =
  'flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2 text-[0.8rem] font-semibold'

/** Informational and muted: the items total never blocks saving. */
export const lineItemsSumClass = cn(sumBase, 'border-t border-border font-normal text-muted')

export const lineItemSheetPairClass = 'grid grid-cols-2 gap-3 [&>*]:min-w-0'

export const lineItemsBlockedHintClass = 'text-center text-[0.78rem] font-semibold text-danger'

/** «طرف حساب» in the entry form: the picker with a ✕ beside it. */
export const counterpartyFieldRowClass =
  'flex items-center gap-2 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1'

export const counterpartyClearButtonClass = cx(
  'flex size-touch-min shrink-0 cursor-pointer items-center justify-center rounded-full border-none',
  'bg-transparent text-muted hover:text-danger'
)

/** Item sheet: the «از مبلغ … · … مانده» line, the name suggestions. */
export const lineItemSheetRemainderRowClass = 'text-[0.82rem] text-muted'

export const lineItemSheetRemainderButtonClass = cx(
  'cursor-pointer border-none bg-transparent p-0 text-[0.82rem] font-bold text-primary',
  'underline-offset-2 hover:underline disabled:cursor-default disabled:no-underline'
)

export const lineItemSuggestionsClass = 'mt-1.5 flex flex-wrap gap-1.5'

export const lineItemSuggestionClass = cx(
  'min-h-8 cursor-pointer rounded-full border border-border bg-bg px-3 text-[0.8rem] font-semibold text-text',
  'hover:border-primary hover:text-primary'
)

/** Records list: «☰ N» after the title, the counterparty chip in the meta line, the item summary. */
export const lineItemsBadgeClass = cx(
  'inline-flex min-h-6 shrink-0 items-center gap-0.5 rounded-full border border-border',
  'bg-bg px-1.5 align-middle text-[0.72rem] font-semibold text-muted'
)

export const recordCounterpartyChipClass = cx(
  'inline-block max-w-[10rem] truncate rounded-full border border-border bg-bg px-2 align-middle',
  'text-[0.7rem] font-semibold leading-5 text-muted'
)

export const recordItemsSummaryClass = 'mt-0.5 line-clamp-1 text-[0.74rem] leading-[1.5] text-muted'
