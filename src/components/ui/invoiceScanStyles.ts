import { cx } from '../../utils/cn'

/** «اسکن فاکتور» sheet: the source buttons, the photo, the proposed rows and the check line. */
export const invoiceScanSourcesClass = 'grid grid-cols-2 gap-3'

export const invoiceScanSourceButtonClass = cx(
  'flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-form',
  'border border-dashed border-border bg-transparent px-3 text-[0.9rem] font-semibold text-primary',
  'transition-[border-color,background] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
  'hover:enabled:border-primary hover:enabled:bg-bg disabled:cursor-not-allowed disabled:opacity-60'
)

export const invoiceScanWorkingClass =
  'flex min-h-40 flex-col items-center justify-center gap-3 text-center text-[0.9rem] text-muted'

export const invoiceScanPhotoClass =
  'max-h-44 w-full rounded-form border border-border bg-bg object-contain'

export const invoiceScanRowClass = cx(
  'grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-1.5 border-b border-border py-2.5 last:border-b-0'
)

export const invoiceScanRowFieldsClass = 'flex min-w-0 flex-col gap-1.5'

/** Under a row's fields, across both columns. */
export const invoiceScanRowWarnClass = 'col-span-2 text-[0.78rem] font-semibold text-warning'

export const invoiceScanNameInputClass = cx(
  'min-h-touch-min w-full rounded-form border border-border bg-surface px-3 text-[0.9rem] text-text',
  'pointer-coarse:text-[16px]'
)

export const invoiceScanCheckClass =
  'flex flex-wrap justify-between gap-x-3 text-[0.8rem] font-semibold'

export const invoiceScanOkClass = 'text-success'

export const invoiceScanWarnClass = 'text-warning'
