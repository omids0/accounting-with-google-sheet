import { type HTMLAttributes } from 'react'

import { cn } from '../../utils/cn'

export type AlertVariant = 'error' | 'success' | 'info' | 'warning'

export function alertClassName(variant: AlertVariant, className?: string) {
  return cn(
    'relative mb-4 overflow-hidden animate-[slideDown_var(--duration-normal)_var(--ease-out)] rounded-[var(--radius-sm)] px-4 py-3 ps-[1rem] text-[0.85rem]',
    'before:absolute before:top-2 before:bottom-2 before:start-0 before:w-[3px] before:rounded-full before:content-[""]',
    variant === 'error' &&
      'border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-danger before:bg-danger',
    variant === 'success' &&
      'border border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-success before:bg-success',
    variant === 'info' &&
      'border border-border bg-bg text-[var(--color-primary-dark)] before:bg-primary',
    variant === 'warning' &&
      'border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-warning before:bg-warning',
    className
  )
}

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant: AlertVariant
}

export default function Alert({ variant, className, ...props }: AlertProps) {
  return <div className={alertClassName(variant, className)} role="alert" {...props} />
}
