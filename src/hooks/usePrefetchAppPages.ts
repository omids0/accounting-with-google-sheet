import { useEffect } from 'react'

import { prefetchBottomNavPages, prefetchSecondaryAppPages } from '../routes/prefetchPages'

const IDLE_TIMEOUT_MS = 3_000

const NO_IDLE_FALLBACK_MS = 1_500

let prefetchScheduled = false

function saveDataEnabled(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection

  return connection?.saveData === true
}

function prefetchAllPages(): void {
  prefetchBottomNavPages()
  if (!saveDataEnabled()) prefetchSecondaryAppPages()
}

/**
 * Warms every page chunk once per app session so first visits don't flash a
 * skeleton. Waits for the first paint and then for an idle slot, so it never
 * competes with the page the user actually opened.
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
      prefetchAllPages()
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
