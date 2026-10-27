import { memo, type CSSProperties, type ReactNode } from 'react'

import { recordItemMainClass } from './ui/displayStyles'
import {
  recordItemAccentClass,
  recordItemInteractiveClass,
  recordItemMetaClass,
  recordItemOpenClass,
  recordItemTitleAddonClass,
  recordItemTitleClass,
  recordItemTitleTextClass
} from './ui/recordsStyles'
import { cn } from '../utils/cn'

type TransactionTone = 'income' | 'expense' | 'neutral'

interface TransactionListItemProps {
  title: string
  /** After the title, e.g. the «📎 N» attachment badge. */
  titleAddon?: ReactNode
  meta?: ReactNode
  /** A muted line under the meta (e.g. the invoice items of a record). */
  detail?: ReactNode
  children?: ReactNode
  tone?: TransactionTone
  index?: number
  className?: string
  /** Makes the whole row open something; the buttons inside keep their own taps. */
  onOpen?: () => void
  openLabel?: string
  /** A long title wraps onto more lines instead of ending in «…» (names that must be read whole). */
  wrapTitle?: boolean
}

function TransactionListItem({
  title,
  titleAddon,
  meta,
  detail,
  children,
  tone = 'neutral',
  index = 0,
  className,
  onOpen,
  openLabel,
  wrapTitle = false
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
      {onOpen ? (
        <button
          type="button"
          className={recordItemOpenClass}
          onClick={onOpen}
          aria-label={openLabel ?? title}
        />
      ) : null}
      <div className={recordItemMainClass}>
        <div className={recordItemTitleClass}>
          <span
            className={
              wrapTitle ? 'max-w-full whitespace-normal break-words' : recordItemTitleTextClass
            }
          >
            {title}
          </span>
          {titleAddon ? <span className={recordItemTitleAddonClass}>{titleAddon}</span> : null}
        </div>
        {meta ? <div className={recordItemMetaClass}>{meta}</div> : null}
        {detail}
      </div>
      {children}
    </div>
  )
}

/** Skips re-render when callers pass stable props (records rows are memoized one level up). */
export default memo(TransactionListItem)
