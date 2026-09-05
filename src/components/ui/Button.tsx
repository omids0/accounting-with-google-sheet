import { type ButtonHTMLAttributes } from 'react'

import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outflow' | 'inflow'
export type ButtonSize = 'md' | 'sm'

const baseClass =
  'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-sm font-bold transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)] active:enabled:scale-[0.97] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2'

const sizeClass: Record<ButtonSize, string> = {
  md: 'w-full px-5 py-3 text-[0.95rem]',
  sm: 'w-auto px-3 py-1.5 text-[0.8rem]'
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'text-white shadow-[0_4px_14px_rgba(15,118,110,0.3)] [background:linear-gradient(135deg,var(--color-primary),var(--color-primary-light))] before:pointer-events-none before:absolute before:inset-0 before:content-[""] before:[background:linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.22)_50%,transparent_70%)] before:opacity-0 before:transition-opacity before:duration-[var(--duration-normal)] hover:enabled:before:opacity-100 hover:enabled:-translate-y-px hover:enabled:shadow-[0_6px_20px_rgba(15,118,110,0.35)] hover:enabled:[background:linear-gradient(135deg,var(--color-primary-dark),var(--color-primary))] disabled:opacity-60',
  secondary:
    'border-[1.5px] border-border bg-bg text-primary hover:enabled:border-primary hover:enabled:bg-[color-mix(in_srgb,var(--color-accent-soft)_55%,var(--color-bg))]',
  danger:
    'border-[1.5px] border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-danger hover:enabled:bg-[color-mix(in_srgb,var(--color-danger)_8%,var(--color-danger-bg))]',
  outflow:
    'bg-danger text-white shadow-[0_3px_12px_color-mix(in_srgb,var(--color-danger)_28%,transparent)] hover:enabled:bg-[#b91c1c] disabled:opacity-60',
  inflow:
    'bg-success text-white shadow-[0_3px_12px_color-mix(in_srgb,var(--color-success)_28%,transparent)] hover:enabled:bg-[#15803d] disabled:opacity-60'
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
