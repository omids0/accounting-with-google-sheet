import { type HTMLAttributes } from 'react'

import { cn } from '../../utils/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function cardClassName(className?: string) {
  return cn(
    'mb-stack rounded-[var(--radius)] border border-border bg-surface p-card transition-[box-shadow,transform,border-color] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:shadow-lg',
    className
  )
}

export function cardTitleClassName(className?: string) {
  return cn('mb-2 text-base font-bold text-[var(--color-primary-dark)]', className)
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
