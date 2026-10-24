import { useEffect, useState } from 'react'

/** Google's sign-in script that is still missing after this long is treated as failed to load. */
export const SCRIPT_STALL_MS = 8_000

/**
 * True when Google's script is not there yet and either the browser is offline or it
 * has taken too long, so the sign-in button should stop waiting and offer a retry.
 * `retryKey` restarts the wait after each retry.
 */
export function useScriptStalled(ready: boolean, retryKey: number): boolean {
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    setStalled(false)
    if (ready) return

    if (navigator.onLine === false) {
      setStalled(true)

      return
    }

    const timer = window.setTimeout(() => setStalled(true), SCRIPT_STALL_MS)

    return () => window.clearTimeout(timer)
  }, [ready, retryKey])

  return stalled && !ready
}
