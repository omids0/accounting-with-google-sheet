import { type RefObject, useEffect } from 'react'

/** Room kept between the current link and the column's edge before it counts as visible. */
const EDGE_MARGIN_PX = 24

interface VerticalSpan {
  top: number
  bottom: number
}

/**
 * How far a menu column must scroll so its current link is fully visible: 0 while the link has
 * room on both sides, otherwise enough to center it (which also reveals the rows right after it,
 * settings then about). Positive scrolls down.
 */
export function scrollDeltaToReveal(
  box: VerticalSpan,
  item: VerticalSpan,
  margin = EDGE_MARGIN_PX
) {
  if (item.top >= box.top + margin && item.bottom <= box.bottom - margin) return 0

  return (item.top + item.bottom) / 2 - (box.top + box.bottom) / 2
}

/**
 * Scrolls a menu column so the current page's link (`[aria-current="page"]`) is fully visible.
 * Only the column scrolls, never the page behind it. Runs again when `watch` changes.
 */
export function useScrollActiveIntoView(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  watch: unknown
) {
  useEffect(() => {
    if (!enabled) return

    const frame = requestAnimationFrame(() => {
      const container = containerRef.current
      const active = container?.querySelector<HTMLElement>('[aria-current="page"]')

      if (!container || !active) return

      container.scrollTop += scrollDeltaToReveal(
        container.getBoundingClientRect(),
        active.getBoundingClientRect()
      )
    })

    return () => cancelAnimationFrame(frame)
  }, [containerRef, enabled, watch])
}
