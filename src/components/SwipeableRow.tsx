import type { ReactNode } from 'react'

import {
  swipeContentClass,
  swipeHintClass,
  swipeRowClass,
  swipeSnapClass,
  type SwipeHintTone
} from './ui/swipeStyles'
import { type SwipeActions, useSwipeActions } from '../hooks/useSwipeActions'
import { cn } from '../utils/cn'

type SwipeableRowProps = SwipeActions & {
  /** Shown behind the card while dragging right / left. */
  rightLabel?: string
  leftLabel?: string
  /** Colour of the right-drag hint (the left one is always muted, e.g. «نادیده»). */
  rightTone?: SwipeHintTone
  children: ReactNode
}

/** A list card that runs an action when dragged sideways on a touch screen. */
export default function SwipeableRow({
  rightLabel,
  leftLabel,
  rightTone = 'income',
  children,
  ...actions
}: SwipeableRowProps) {
  const { offset, handlers } = useSwipeActions(actions)
  const direction = offset > 0 ? 'right' : 'left'

  return (
    <div className={swipeRowClass}>
      {offset !== 0 && (
        <div className={swipeHintClass(direction, offset > 0 ? rightTone : 'muted')} aria-hidden>
          {offset > 0 ? rightLabel : leftLabel}
        </div>
      )}
      <div
        {...handlers}
        className={cn(swipeContentClass, offset === 0 && swipeSnapClass)}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}
