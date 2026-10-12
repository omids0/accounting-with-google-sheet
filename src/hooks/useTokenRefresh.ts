import { useEffect, useRef } from 'react'

import { getMsUntilTokenRefresh, hasStoredSession, shouldRefreshToken } from '../services/auth'
import { isNativePlatform } from '../services/googleAuthNative'
import { refreshAccessTokenSilently } from '../services/tokenRefresh'

interface UseTokenRefreshOptions {
  clientId: string
  enabled: boolean
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

    const runRefresh = async () => {
      if (cancelled) return

      if (!shouldRefreshToken()) {
        scheduleNextRefresh()

        return
      }

      const ok = await refreshAccessTokenSilently(clientId)

      if (cancelled) return

      if (ok) {
        onRefreshSuccessRef.current?.()
        scheduleNextRefresh()

        return
      }

      onRefreshFailedRef.current?.()
    }

    const scheduleNextRefresh = () => {
      if (cancelled) return

      const delay = getMsUntilTokenRefresh()

      if (delay === null) return

      timeoutId = window.setTimeout(runRefresh, delay)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || cancelled) return
      if (!shouldRefreshToken()) return
      void runRefresh()
    }

    scheduleNextRefresh()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clientId, enabled])
}
