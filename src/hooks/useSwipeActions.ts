import { useRef, useState, type TouchEvent } from 'react'

import { haptic } from '../utils/haptics'
import {
  lockSwipeAxis,
  swipeOffset,
  swipeOutcome,
  swipeThreshold,
  type SwipeAxis
} from '../utils/swipeGesture'

export interface SwipeActions {
  /** Drag to the right (screen direction). */
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  disabled?: boolean
}

type Drag = { x: number; y: number; dx: number; width: number; axis: SwipeAxis | null }

/**
 * Touch-only swipe: mouse and keyboard users have the same actions as buttons.
 * Vertical moves are left to the browser (pair with `touch-action: pan-y`), so the
 * list keeps scrolling; a tick plays when a drag passes the threshold.
 */
export function useSwipeActions({ onSwipeRight, onSwipeLeft, disabled }: SwipeActions) {
  const drag = useRef<Drag | null>(null)
  const [offset, setOffset] = useState(0)
  const allowed = { right: !!onSwipeRight, left: !!onSwipeLeft }

  const reset = () => {
    drag.current = null
    setOffset(0)
  }

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (disabled || event.touches.length !== 1) return
    // Dragging a caret or a selection in a field must not arm the swipe action.
    if ((event.target as HTMLElement).closest('input, textarea, select')) return

    const touch = event.touches[0]

    drag.current = {
      x: touch.clientX,
      y: touch.clientY,
      dx: 0,
      width: event.currentTarget.offsetWidth,
      axis: null
    }
  }

  const onTouchMove = (event: TouchEvent<HTMLElement>) => {
    const current = drag.current

    if (!current) return

    const touch = event.touches[0]
    const dx = touch.clientX - current.x

    current.axis ??= lockSwipeAxis(dx, touch.clientY - current.y)
    if (current.axis !== 'x') return

    const threshold = swipeThreshold(current.width)
    const wasArmed = Math.abs(swipeOffset(current.dx, allowed)) >= threshold
    const next = swipeOffset(dx, allowed)

    if (!wasArmed && Math.abs(next) >= threshold) haptic('selection')
    current.dx = dx
    setOffset(next)
  }

  const onTouchEnd = () => {
    const current = drag.current

    reset()
    if (current?.axis !== 'x') return

    const outcome = swipeOutcome(current.dx, current.width, allowed)

    if (outcome === 'right') onSwipeRight?.()
    if (outcome === 'left') onSwipeLeft?.()
  }

  return {
    offset,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset }
  }
}
