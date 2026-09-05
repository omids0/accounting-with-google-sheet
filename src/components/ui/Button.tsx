import { type ButtonHTMLAttributes } from 'react'

import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outflow' | 'inflow'
export type ButtonSize = 'md' | 'sm'

const baseClass =
  'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-sm font-bold transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)] active:enabled:scale-[0.97] disabled:cursor-not-allowed'

const sizeClass: Record<ButtonSize, string> = {
  md: 'w-full px-5 py-3 text-[0.95rem]',
  sm: 'w-auto px-3 py-1.5 text-xs'
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'text-white shadow-[0_4px_14px_rgba(15,118,110,0.3)] [background:linear-gradient(135deg,var(--color-primary),var(--color-primary-light))] hover:enabled:-translate-y-px hover:enabled:shadow-[0_6px_20px_rgba(15,118,110,0.35)] hover:enabled:[background:linear-gradient(135deg,var(--color-primary-dark),var(--color-primary))] disabled:opacity-60',
  secondary: 'border-[1.5px] border-border bg-bg text-primary hover:enabled:border-primary',
  danger:
    'border-[1.5px] border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-danger',
  outflow: 'bg-danger text-white hover:enabled:bg-[#b91c1c] disabled:opacity-60',
  inflow: 'bg-success text-white hover:enabled:bg-[#15803d] disabled:opacity-60'
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}) {
  return cn(baseClass, sizeClass[size], variantClass[variant], className)
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClassName({ variant, size, className })} {...props} />
}
