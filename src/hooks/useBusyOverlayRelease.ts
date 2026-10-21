import { useEffect } from 'react'

import { hideBusy, trackPendingPage, useBusyOverlayStore } from '../stores/busyOverlayStore'

/**
 * A page that a workspace switch opens calls this with «my data is on screen»: the busy overlay,
 * which the switch keeps up until then, goes away at the first render with data instead of
 * uncovering a skeleton. Does nothing while no switch is waiting.
 */
export function useBusyOverlayRelease(ready: boolean): void {
  const awaitingPage = useBusyOverlayStore(state => state.awaitingPage)

  useEffect(() => {
    if (ready && awaitingPage) hideBusy()
  }, [ready, awaitingPage])

  // A page that is still loading holds the overlay past the short fallback.
  useEffect(() => (ready ? undefined : trackPendingPage()), [ready])
}
