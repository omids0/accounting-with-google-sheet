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

export const formErrorClass = 'mt-1.5 text-[0.76rem] font-semibold leading-[1.45] text-danger'

export const formControlInvalidClass = cn(
  '!border-danger hover:enabled:!border-danger focus-visible:!border-danger',
  'focus-within:!border-danger shadow-[0_0_0_3px_var(--color-danger-bg)]'
)

/** Fixed single-line control height so inputs, pickers, and selects align in form rows. */
export const formControlSizeClass = 'h-touch-min px-3.5 text-[0.95rem] leading-[1.4] lg:px-3'

export function formControlClassName(className?: string) {
  return cn(
    'w-full rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] text-text shadow-[var(--form-input-shadow)] transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:enabled:border-[var(--form-input-border-hover)] focus-visible:border-primary focus-visible:shadow-[var(--form-input-focus-shadow)] focus-visible:outline-none',
    formControlSizeClass,
    className
  )
}

export function formActionsClassName(className?: string) {
  return cn('mt-2 flex flex-wrap gap-2 lg:justify-end', className)
}

export function appFormClassName(className?: string) {
  return cn(formFieldsLayoutClass, className)
}
