import { type HTMLAttributes } from 'react'

import { cn } from '../../utils/cn'

export type AlertVariant = 'error' | 'success' | 'info' | 'warning'

const variantClass: Record<AlertVariant, string> = {
  error: 'border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-danger',
  success: 'border border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-success',
  info: 'border border-border bg-bg text-[var(--color-primary-dark)]',
  warning: 'border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-warning'
}

export function alertClassName(variant: AlertVariant, className?: string) {
  return cn(
    'mb-4 animate-[slideDown_var(--duration-normal)_var(--ease-out)] rounded-sm px-4 py-3 text-[0.85rem]',
    variantClass[variant],
    className
  )
}

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant: AlertVariant
}

export default function Alert({ variant, className, ...props }: AlertProps) {
  return <div className={alertClassName(variant, className)} role="alert" {...props} />
}
