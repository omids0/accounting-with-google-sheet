import { cn } from '../../utils/cn'

export const formFieldClass = 'mb-[var(--form-gap)]'

export const formLabelClass =
  'mb-1.5 block text-[0.82rem] font-semibold text-[var(--form-label-color)]'

export const formHintClass = 'my-1.5 text-[0.78rem] leading-[1.5] text-muted'

export function formControlClassName(className?: string) {
  return cn(
    'min-h-touch-min w-full rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] px-3.5 py-3 text-text shadow-[var(--form-input-shadow)] transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:enabled:border-[var(--form-input-border-hover)] focus-visible:border-primary focus-visible:shadow-[var(--form-input-focus-shadow)] focus-visible:outline-none',
    className
  )
}

export function formActionsClassName(className?: string) {
  return cn('mt-2 flex flex-wrap gap-2', className)
}

export function appFormClassName(className?: string) {
  return cn('flex flex-col gap-[var(--form-gap)]', className)
}
