import { useEffect } from 'react'

import { TABLET_MEDIA_QUERY } from './useMediaQuery'
import { prefetchBottomNavPages } from '../routes/prefetchPages'

const IDLE_TIMEOUT_MS = 3_000

const NO_IDLE_FALLBACK_MS = 1_500

let prefetchScheduled = false

/**
 * Warms the bottom-nav page chunks once per app session so first visits don't
 * flash a skeleton. Waits for the first paint and then for an idle slot, so it
 * never competes with the page the user actually opened. Menu-only pages load
 * when the drawer opens or a menu item is hovered/touched (see prefetchPages);
 * on desktop the bottom bar is hidden, so the sidebar's hover does all of it.
 */
export function usePrefetchAppPages(): void {
  useEffect(() => {
    if (prefetchScheduled) return
    prefetchScheduled = true

    let frame = 0
    let timer = 0
    let idleHandle = 0
    let fired = false

    const run = () => {
      fired = true
      if (!window.matchMedia(TABLET_MEDIA_QUERY).matches) prefetchBottomNavPages()
    }

    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
      } else {
        timer = window.setTimeout(run, NO_IDLE_FALLBACK_MS)
      }
    }

    // rAF fires before the first paint; the timeout after it lands past that paint.
    frame = requestAnimationFrame(() => {
      timer = window.setTimeout(scheduleIdle, 0)
    })

    return () => {
      if (fired) return
      // Unmounted before it ran (e.g. StrictMode's double effect): let the next mount schedule it.
      prefetchScheduled = false
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      if (idleHandle && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle)
      }
    }
  }, [])
}
