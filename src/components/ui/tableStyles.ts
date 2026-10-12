import { cn, cx } from '../../utils/cn'

/** Desktop table views (list pages, dashboard «تراکنش‌های اخیر»). */
export function dataTableWrapClass(bare?: boolean) {
  return cn(
    'data-table overflow-x-auto',
    !bare && 'rounded-[var(--radius)] border border-border bg-surface px-1 shadow-[var(--shadow)]'
  )
}

export const dataTableClass = 'w-full border-collapse text-[0.82rem] text-text'

export const dataTableHeadCellClass = cx(
  'whitespace-nowrap border-b border-border px-3 py-2.5 text-start text-[0.72rem] font-bold text-muted'
)

export const dataTableSortBtnClass = cx(
  'inline-flex cursor-pointer items-center gap-1 rounded-md border-none bg-transparent p-0 font-[inherit] text-[inherit]',
  'hover:text-text'
)

export function dataTableSortIconClass(direction?: 'asc' | 'desc') {
  return cn(
    'inline-flex transition-transform duration-[var(--duration-fast)]',
    !direction && 'opacity-0',
    direction === 'asc' && 'rotate-180'
  )
}

export function dataTableRowClass(muted?: boolean) {
  return cn(
    'border-b border-border last:border-b-0',
    'hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]',
    muted && 'text-muted [&_td]:opacity-80'
  )
}

export const dataTableCellClass = 'px-3 py-2.5 align-middle'

export const dataTableNumericClass =
  'whitespace-nowrap text-end font-numeric font-bold tabular-nums'

export const dataTableActionsCellClass = 'w-px whitespace-nowrap px-2 py-1.5 align-middle'

export const dataTableActionsClass = 'flex items-center justify-end gap-1'

export const dataTableDetailCellClass = cx(
  'border-b border-border px-3 pb-3 pt-1',
  'bg-[color-mix(in_srgb,var(--color-text)_3%,transparent)]'
)

/** A text button inside a cell (opens the row: a vehicle, a timesheet). */
export const dataTableLinkClass = cn(
  'cursor-pointer border-none bg-transparent p-0 text-start font-[inherit] font-semibold text-text',
  'hover:text-primary-dark hover:underline'
)

/** Totals under a table: cards side by side. */
export const dataTableTotalsClass = 'grid grid-cols-2 gap-4 [&>*]:mb-0'
