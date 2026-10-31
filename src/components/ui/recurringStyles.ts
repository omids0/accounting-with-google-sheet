import { cx } from '../../utils/cn'

/** One option of «تکرار این تراکنش» (a radio row with a title and a hint). */
export function recurringOptionClass(selected: boolean) {
  return cx(
    'flex w-full min-h-touch-min cursor-pointer items-start gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2 text-start',
    'transition-[border-color,background] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    selected
      ? 'border-primary bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))]'
      : 'border-border bg-surface hover:border-primary'
  )
}

export function recurringRadioClass(selected: boolean) {
  return cx(
    'mt-0.5 inline-block size-4 flex-none rounded-full border-2',
    selected
      ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_var(--color-surface)]'
      : 'border-muted'
  )
}

export const recurringOptionsClass = 'flex flex-col gap-2'

export const recurringOptionTitleClass = 'block text-[0.85rem] font-semibold text-text'

export const recurringOptionHintClass = 'block text-[0.75rem] leading-relaxed text-muted'

/** «تکرار ماهانه» link inside the green «ذخیره شد» toast. */
export const recurringToastLinkClass = cx(
  'ms-2 inline-flex min-h-touch-min cursor-pointer items-center border-none bg-transparent px-1',
  'text-[0.8rem] font-bold text-primary underline-offset-2 hover:underline'
)

/** Dashboard «ثبت تکرارهای مهر»: the checkbox rows under the card head. */
export const recurringCardClass = 'flex-col items-stretch'

export const recurringCardHeadClass = 'flex items-center gap-3'

export const recurringRowsClass = 'mt-1 flex flex-col border-t border-border'

export const recurringRowClass =
  'flex min-h-touch-min cursor-pointer items-center gap-3 border-b border-border py-2 last:border-b-0'

export const recurringRowDayClass =
  'inline-flex size-8 flex-none items-center justify-center rounded-full bg-bg text-[0.75rem] font-bold text-muted'

export const recurringRowTextClass = 'flex min-w-0 flex-1 flex-col'

export const recurringRowTitleClass = 'truncate text-[0.85rem] font-semibold text-text'

export const recurringRowMetaClass = 'truncate text-[0.72rem] text-muted'

export const recurringRowAmountClass = 'flex-none text-[0.85rem] font-bold tabular-nums text-text'

export const recurringCheckboxClass =
  'size-5 flex-none cursor-pointer accent-[var(--color-primary)]'

/** «دیدن آن رکورد» under a row whose payment looks already recorded. */
export const recurringRowLinkClass = cx(
  // Small to look at, 44px to touch: the hit area reaches past the text, inside the row.
  'relative cursor-pointer border-none bg-transparent p-0 text-[0.75rem] font-semibold text-primary',
  'underline-offset-2 hover:underline',
  'after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[""]'
)

/** Chip and link of a row side by side; they wrap under each other in a narrow column. */
export const recurringRowStatusClass = 'mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1'

/** The warning under a ticked row: wraps (never truncated) and keeps its contrast in dark mode. */
export const recurringRowNoteClass = 'text-[0.72rem] font-semibold leading-relaxed text-warning'
