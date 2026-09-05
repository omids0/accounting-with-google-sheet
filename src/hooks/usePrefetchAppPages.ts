import { useEffect } from 'react'

import { prefetchBottomNavPages, prefetchSecondaryAppPages } from '../routes/prefetchPages'

export function usePrefetchAppPages(): void {
  useEffect(() => {
    prefetchBottomNavPages()

    const scheduleSecondaryPrefetch = () => prefetchSecondaryAppPages()

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(scheduleSecondaryPrefetch, { timeout: 3_000 })

      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(scheduleSecondaryPrefetch, 1_500)

    return () => window.clearTimeout(timeoutId)
  }, [])
}
