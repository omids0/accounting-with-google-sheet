import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from 'react'

interface AnchorRect {
  top: number
  bottom: number
  left: number
  width: number
}

interface AnchorViewport {
  width: number
  height: number
}

interface AnchorOptions {
  gap?: number
  maxHeight?: number
  minHeight?: number
}

export interface AnchoredPosition {
  top?: number
  bottom?: number
  left: number
  width: number
  maxHeight: number
}

const EDGE = 8

/**
 * Where a fixed popup sits under its trigger: below by default, flipped above when
 * the room below is under `minHeight` and the room above is larger, and always
 * inside the viewport's left/right edges.
 */
export function anchoredPosition(
  rect: AnchorRect,
  viewport: AnchorViewport,
  { gap = 4, maxHeight = 320, minHeight = 160 }: AnchorOptions = {}
): AnchoredPosition {
  const width = Math.min(rect.width, viewport.width - EDGE * 2)
  const left = Math.max(EDGE, Math.min(rect.left, viewport.width - width - EDGE))
  const top = rect.bottom + gap
  const roomBelow = viewport.height - top - EDGE
  const roomAbove = rect.top - gap - EDGE

  if (roomBelow < minHeight && roomAbove > roomBelow) {
    return {
      bottom: viewport.height - rect.top + gap,
      left,
      width,
      maxHeight: Math.min(maxHeight, roomAbove)
    }
  }

  return { top, left, width, maxHeight: Math.min(maxHeight, Math.max(roomBelow, 0)) }
}

/**
 * Fixed-position style for a popup portalled out of a clipping parent, kept in sync
 * on scroll (any ancestor) and resize. `onLeave` fires once the trigger scrolls out of view.
 */
export function useAnchoredPosition(
  triggerRef: RefObject<HTMLElement>,
  open: boolean,
  onLeave?: () => void
): CSSProperties | undefined {
  const [position, setPosition] = useState<AnchoredPosition>()
  const onLeaveRef = useRef(onLeave)

  onLeaveRef.current = onLeave

  useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()

      if (!rect) return

      const viewport = { width: window.innerWidth, height: window.innerHeight }

      if (rect.bottom < 0 || rect.top > viewport.height) return onLeaveRef.current?.()
      setPosition(anchoredPosition(rect, viewport))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)

    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, triggerRef])

  return open ? position : undefined
}
