import { type HTMLAttributes } from 'react'

import { cn } from '../../utils/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function cardClassName(className?: string) {
  return cn(
    'mb-stack rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-surface p-card',
    '[background:linear-gradient(165deg,var(--color-surface)_0%,color-mix(in_srgb,var(--color-accent-soft)_28%,var(--color-surface))_100%)]',
    'shadow-[var(--shadow),inset_0_1px_0_rgba(255,255,255,0.55)] transition-[box-shadow,transform,border-color] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
    'hover:shadow-[var(--shadow-lg),0_4px_18px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]',
    className
  )
}

export function cardTitleClassName(className?: string) {
  return cn('mb-2 text-[0.88rem] font-bold text-[var(--color-primary-dark)]', className)
}

export default function Card({ className, ...props }: CardProps) {
  return <div className={cardClassName(className)} {...props} />
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cardTitleClassName(className)} {...props}>
      {children}
    </h3>
  )
}
