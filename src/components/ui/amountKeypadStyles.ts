import { cn } from '../../utils/cn'

/** The field that opens the dial pad: looks like the amount input, acts as a button. */
export const amountFieldButtonClass = cn(
  'flex h-touch-min w-full cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] px-3.5 text-start shadow-[var(--form-input-shadow)]',
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-[var(--form-input-border-hover)] focus-visible:border-primary focus-visible:shadow-[var(--form-input-focus-shadow)]'
)

export const amountFieldValueClass =
  'numeric text-[1.05rem] font-bold tabular-nums [direction:ltr] [unicode-bidi:isolate]'

export const amountFieldPlaceholderClass = 'text-[0.95rem] text-muted'

export const amountFieldUnitClass = 'text-[0.72rem] font-bold text-muted'

export const keypadDisplayClass =
  'numeric flex items-baseline justify-center gap-2 px-3 pt-1 text-[2.1rem] font-extrabold tabular-nums text-primary-dark [direction:ltr] [unicode-bidi:isolate]'

export const keypadUnitClass = 'text-[0.8rem] font-medium text-muted'

export const keypadQuickRowClass = 'flex flex-wrap justify-center gap-1.5 [direction:ltr]'

export const keypadQuickChipClass =
  'numeric cursor-pointer rounded-full border border-border bg-accent-soft px-3 py-1 text-[0.8rem] font-bold text-primary-dark active:scale-[0.96]'

/** 1-9, «۰۰۰», 0 and backspace read left to right whatever the page direction. */
export const keypadGridClass = 'grid grid-cols-3 gap-2 [direction:ltr]'

export function keypadKeyClass(alt = false) {
  return cn(
    'numeric flex h-[3.4rem] cursor-pointer items-center justify-center rounded-[0.9rem] border-[1.5px] border-border bg-bg text-[1.35rem] font-bold text-text transition-colors duration-[var(--duration-fast)] active:bg-accent-soft',
    alt && 'text-[1.1rem] text-primary'
  )
}
