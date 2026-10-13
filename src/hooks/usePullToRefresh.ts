import { useEffect, useRef, useState } from 'react'

import { getOverlayCount } from './overlayStack'

/** Row height (px) the pull must reach before letting go refreshes. */
export const PULL_THRESHOLD = 64

/** The row stops growing here, however far the finger goes. */
export const PULL_MAX = 96

/** The row grows at half the finger's speed, so the pull feels weighted. */
const PULL_RESISTANCE = 0.5

/** Movement (px) before the gesture is classed as a pull or a scroll. */
const INTENT_SLOP = 8

/** The spinner stays at least this long, so a cached reload still reads as one. */
const MIN_REFRESH_MS = 600

export type PullPhase = 'idle' | 'pulling' | 'ready' | 'refreshing'

/** Row height for a finger drag of `deltaY` px down. */
export function pullDistance(deltaY: number, max = PULL_MAX): number {
  if (deltaY <= 0) return 0

  return Math.min(max, Math.round(deltaY * PULL_RESISTANCE))
}

/** Whether letting go at this row height refreshes (`ready`). */
export function pullPhase(distance: number, threshold = PULL_THRESHOLD): PullPhase {
  if (distance <= 0) return 'idle'

  return distance >= threshold ? 'ready' : 'pulling'
}

/**
 * The first real movement decides the gesture: a mostly vertical drag down is a
 * pull, anything else is left to the browser as a scroll. `null` = not yet known.
 */
export function resolvePullIntent(dx: number, dy: number, slop = INTENT_SLOP) {
  if (Math.abs(dx) < slop && Math.abs(dy) < slop) return null

  return dy > 0 && dy > Math.abs(dx) ? 'pull' : 'scroll'
}

/** The page and every container under the finger are scrolled to the top. */
function isAtTop(target: EventTarget | null): boolean {
  const root = document.scrollingElement ?? document.documentElement

  if (root.scrollTop > 0) return false

  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    if (el.scrollTop > 0) return false
  }

  return true
}

/**
 * Touch pull-down at the top of the page runs `onRefresh` once the row passes
 * {@link PULL_THRESHOLD}. Listeners are passive, so normal scrolling is never
 * blocked; nothing starts while a modal, sheet or the drawer is open.
 */
export function usePullToRefresh(onRefresh: (() => unknown) | null) {
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const onRefreshRef = useRef(onRefresh)
  const refreshingRef = useRef(false)
  const enabled = onRefresh != null

  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!enabled) return

    let start: { x: number; y: number } | null = null
    let intent: 'pull' | 'scroll' | null = null
    let current = 0

    const run = async () => {
      const refresh = onRefreshRef.current

      if (!refresh) return
      refreshingRef.current = true
      setRefreshing(true)

      const startedAt = Date.now()

      try {
        await refresh()
      } catch {
        // Page loaders report their own errors.
      }

      const wait = MIN_REFRESH_MS - (Date.now() - startedAt)

      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
      refreshingRef.current = false
      setRefreshing(false)
    }

    const end = (commit: boolean) => {
      if (!start) return

      const ready = intent === 'pull' && pullPhase(current) === 'ready'

      start = null
      intent = null
      current = 0
      setDistance(0)
      if (commit && ready) void run()
    }

    const onStart = (event: TouchEvent) => {
      start = null
      if (event.touches.length !== 1 || refreshingRef.current) return
      if (getOverlayCount() > 0 || !isAtTop(event.target)) return

      const touch = event.touches[0]

      start = { x: touch.clientX, y: touch.clientY }
      intent = null
    }

    const onMove = (event: TouchEvent) => {
      if (!start) return
      const touch = event.touches.length === 1 ? event.touches[0] : null

      intent ??= touch ? resolvePullIntent(touch.clientX - start.x, touch.clientY - start.y) : null
      // Reversing the drag scrolls the page natively; the pull ends there.
      if (!touch || intent === 'scroll' || !isAtTop(event.target)) {
        end(false)

        return
      }
      if (intent !== 'pull') return

      const dy = touch.clientY - start.y

      current = pullDistance(dy)
      setDistance(current)
    }

    const onEnd = () => end(true)
    const onCancel = () => end(false)
    const options = { passive: true }

    document.addEventListener('touchstart', onStart, options)
    document.addEventListener('touchmove', onMove, options)
    document.addEventListener('touchend', onEnd, options)
    document.addEventListener('touchcancel', onCancel, options)

    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onCancel)
      setDistance(0)
    }
  }, [enabled])

  const phase: PullPhase = refreshing ? 'refreshing' : pullPhase(distance)

  return { distance, phase }
}
