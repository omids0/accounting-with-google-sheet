import { cn } from '../../utils/cn'

export type FormControlWidth = 'auto' | 'compact' | 'standard' | 'full'

/** Single-column form rhythm — pairing is explicit via `FormRow`. */
export const formFieldsLayoutClass = 'flex flex-col gap-[var(--form-gap)]'

export const formFieldClass = cn('form-field min-w-0', 'mb-[var(--form-gap)] last:mb-0')

/** Short inputs (amount, date, count) — natural width on desktop, full width on mobile. */
export const formControlWidthCompactClass = 'w-full lg:max-w-[13.5rem]'

/** Typical text inputs — comfortable reading width without stretching across the page. */
export const formControlWidthStandardClass = 'w-full lg:max-w-[26rem]'

/** Selects, textareas, maps — use available form width. */
export const formControlWidthFullClass = 'w-full'

export const formLabelClass =
  'mb-1.5 block text-[0.82rem] font-semibold text-[var(--form-label-color)]'

export const formHintClass = 'my-1.5 text-[0.78rem] leading-[1.5] text-muted'

export function formControlClassName(className?: string) {
  return cn(
    'min-h-touch-min w-full rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] px-3.5 py-3 text-text shadow-[var(--form-input-shadow)] transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:enabled:border-[var(--form-input-border-hover)] focus-visible:border-primary focus-visible:shadow-[var(--form-input-focus-shadow)] focus-visible:outline-none',
    'lg:px-3 lg:py-2.5',
    className
  )
}

export function formActionsClassName(className?: string) {
  return cn('mt-2 flex flex-wrap gap-2 lg:justify-end', className)
}

export function appFormClassName(className?: string) {
  return cn(formFieldsLayoutClass, className)
}
