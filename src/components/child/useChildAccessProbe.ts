import { useEffect } from 'react'

import { probeChildAccess } from '../../services/childAccessLost'

export const CHILD_PROBE_INTERVAL_MS = 60_000

/**
 * Asks Google whether this device can still open the child's file (one metadata read): when the
 * page opens, every minute while the app is visible, and when the app comes back to the front.
 * The child can remove the share while the parent is looking at the numbers.
 */
export function useChildAccessProbe(id: string): void {
  useEffect(() => {
    if (!id) return

    const probe = () => {
      if (document.visibilityState !== 'hidden') void probeChildAccess(id)
    }

    probe()

    const timer = setInterval(probe, CHILD_PROBE_INTERVAL_MS)

    document.addEventListener('visibilitychange', probe)
    window.addEventListener('focus', probe)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', probe)
      window.removeEventListener('focus', probe)
    }
  }, [id])
}
