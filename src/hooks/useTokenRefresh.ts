import { useEffect, useRef } from 'react'

import { getMsUntilTokenRefresh, hasStoredSession, shouldRefreshToken } from '../services/auth'
import { isNativePlatform } from '../services/googleAuthNative'
import {
  getTransientStreak,
  lastRefreshWasTransient,
  noteBackoffAttempt,
  transientOnlineForMs
} from '../services/refreshStatus'
import { refreshAccessTokenSilently } from '../services/tokenRefresh'

/** Pauses after the 1st, 2nd and 3rd renewal that got no answer. */
export const TRANSIENT_BACKOFF_MS = [15_000, 30_000, 60_000] as const

/** After that, one try every five minutes. */
export const TRANSIENT_STEADY_MS = 5 * 60_000

/** Renewals that keep getting no answer while online for this long mean the session is gone. */
export const TRANSIENT_GIVE_UP_MS = 10 * 60_000

export function transientRetryDelayMs(streak: number): number {
  return TRANSIENT_BACKOFF_MS[streak - 1] ?? TRANSIENT_STEADY_MS
}

interface UseTokenRefreshOptions {
  clientId: string
  enabled: boolean
  /** Google refused, or nothing answered for too long: the user has to sign in again. */
  onRefreshFailed?: () => void
  onRefreshSuccess?: () => void
}

export function useTokenRefresh({
  clientId,
  enabled,
  onRefreshFailed,
  onRefreshSuccess
}: UseTokenRefreshOptions): void {
  const onRefreshFailedRef = useRef(onRefreshFailed)

  onRefreshFailedRef.current = onRefreshFailed

  const onRefreshSuccessRef = useRef(onRefreshSuccess)

  onRefreshSuccessRef.current = onRefreshSuccess

  useEffect(() => {
    // The APK refreshes through the native plugin and needs no web client id; on
    // the web, Google's script is fetched by the refresh itself when one is due.
    if (!enabled || !hasStoredSession()) return
    if (!isNativePlatform() && !clientId) return

    let cancelled = false

    let timeoutId: number | undefined

    /** Only the newest run continues after its request: one timer, one count per attempt. */
    let runSeq = 0

    const schedule = (delayMs: number) => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => void runRefresh(), delayMs)
    }

    const runRefresh = async () => {
      window.clearTimeout(timeoutId)
      if (cancelled) return

      if (!shouldRefreshToken()) {
        scheduleNextRefresh()

        return
      }

      const myRun = ++runSeq

      // This hook is the retry mechanism, so its attempts are not held back by the
      // cool-down that spares other callers.
      const ok = await refreshAccessTokenSilently(clientId, true)

      if (cancelled || myRun !== runSeq) return

      if (ok) {
        onRefreshSuccessRef.current?.()
        scheduleNextRefresh()

        return
      }

      // No answer (offline, Google unreachable) is not an expired session: try again
      // with growing pauses, and only give up after ten awake minutes of silence while
      // online. Only this timer's own attempts count towards the pauses and the give-up.
      if (lastRefreshWasTransient()) {
        noteBackoffAttempt()

        if (transientOnlineForMs() < TRANSIENT_GIVE_UP_MS) {
          schedule(transientRetryDelayMs(getTransientStreak()))

          return
        }
      }

      onRefreshFailedRef.current?.()
    }

    const scheduleNextRefresh = () => {
      if (cancelled) return

      const delay = getMsUntilTokenRefresh()

      if (delay === null) return

      schedule(delay)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || cancelled) return
      if (!shouldRefreshToken()) return
      void runRefresh()
    }

    // The connection is back: ask at once instead of waiting out the pause.
    const handleOnline = () => {
      if (!cancelled && shouldRefreshToken()) void runRefresh()
    }

    scheduleNextRefresh()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [clientId, enabled])
}
