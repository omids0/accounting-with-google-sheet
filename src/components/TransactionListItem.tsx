import type { CSSProperties, ReactNode } from 'react'

import { recordItemMainClass } from './ui/displayStyles'
import {
  recordItemAccentClass,
  recordItemInteractiveClass,
  recordItemMetaClass,
  recordItemTitleClass
} from './ui/recordsStyles'
import { cn } from '../utils/cn'

type TransactionTone = 'income' | 'expense' | 'neutral'

interface TransactionListItemProps {
  title: string
  meta?: ReactNode
  children?: ReactNode
  tone?: TransactionTone
  index?: number
  className?: string
}

export default function TransactionListItem({
  title,
  meta,
  children,
  tone = 'neutral',
  index = 0,
  className
}: TransactionListItemProps) {
  const style: CSSProperties = {
    animationDelay: `${Math.min(index, 12) * 0.04}s`
  }

  return (
    <div
      className={cn(
        'record-item--interactive',
        `record-item--${tone}`,
        'flex items-center justify-between gap-3 border-b border-border last:border-b-0',
        recordItemInteractiveClass,
        className
      )}
      style={style}
    >
      <span className={recordItemAccentClass} aria-hidden="true" />
      <div className={recordItemMainClass}>
        <div className={recordItemTitleClass}>{title}</div>
        {meta ? <div className={recordItemMetaClass}>{meta}</div> : null}
      </div>
      {children}
    </div>
  )
}
