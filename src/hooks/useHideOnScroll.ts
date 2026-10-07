import { useCallback, useEffect, useRef, useState } from 'react'

interface HideOnScrollOptions {
  /** Keep the element visible (e.g. while a menu it owns is open). */
  disabled?: boolean
  /** Distance from the top or bottom edge where the element always shows. */
  edgeOffset?: number
  /** Scroll distance to ignore so small jitters do not toggle it. */
  threshold?: number
}

export type ScrollMetrics = { top: number; viewport: number; height: number }

/**
 * Next visibility for one scroll position, or `null` to keep the current one
 * (movement below `threshold`). Always visible within `edgeOffset` of either end.
 */
export function resolveHideOnScroll(
  { top, viewport, height }: ScrollMetrics,
  lastTop: number | null,
  { edgeOffset, threshold }: { edgeOffset: number; threshold: number }
): { hidden: boolean; lastTop: number } | null {
  if (top <= edgeOffset || top + viewport >= height - edgeOffset) {
    return { hidden: false, lastTop: top }
  }

  // First event away from the edges (e.g. restored scroll): record a baseline.
  if (lastTop === null) return { hidden: false, lastTop: top }

  const delta = top - lastTop

  if (Math.abs(delta) < threshold) return null

  return { hidden: delta > 0, lastTop: top }
}

/**
 * Page scroll comes from the window on phones and from the layout `<main>` on
 * desktop. Scrolls inside modals, pickers or carousels are ignored.
 */
function readScrollMetrics(target: EventTarget | null): ScrollMetrics | null {
  if (target === document || target === document.documentElement || target === window) {
    const root = document.scrollingElement ?? document.documentElement

    return { top: root.scrollTop, viewport: window.innerHeight, height: root.scrollHeight }
  }

  if (target instanceof HTMLElement && target.tagName === 'MAIN') {
    return { top: target.scrollTop, viewport: target.clientHeight, height: target.scrollHeight }
  }

  return null
}

/**
 * Hides a floating control while the page scrolls down and brings it back on
 * scroll up, near the top and near the end of the page.
 */
export function useHideOnScroll({
  disabled = false,
  edgeOffset = 72,
  threshold = 12
}: HideOnScrollOptions = {}) {
  const [hidden, setHidden] = useState(false)
  const lastTopRef = useRef<number | null>(null)
  const frameRef = useRef(0)

  const reveal = useCallback(() => setHidden(false), [])

  useEffect(() => {
    if (disabled) {
      setHidden(false)

      return
    }

    const update = (metrics: ScrollMetrics) => {
      const next = resolveHideOnScroll(metrics, lastTopRef.current, { edgeOffset, threshold })

      if (!next) return

      lastTopRef.current = next.lastTop
      setHidden(next.hidden)
    }

    const onScroll = (event: Event) => {
      const metrics = readScrollMetrics(event.target)

      if (!metrics) return

      cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(() => update(metrics))
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true })

    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      cancelAnimationFrame(frameRef.current)
    }
  }, [disabled, edgeOffset, threshold])

  return { hidden: hidden && !disabled, reveal }
}
