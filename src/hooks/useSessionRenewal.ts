import { useCallback, useEffect, type MutableRefObject } from 'react'

import { useTokenRefresh } from './useTokenRefresh'
import { hasStoredSession, isTokenValid } from '../services/auth'
import { lastRefreshWasTransient, refreshAccessTokenSilently } from '../services/tokenRefresh'
import { useAppStore } from '../stores/appStore'

interface UseSessionRenewalOptions {
  clientId: string
  loggedIn: boolean
  /** False while start-up is still renewing the token; an early 401 must not flash the login. */
  startupDoneRef: MutableRefObject<boolean>
  setLoggedIn: (value: boolean) => void
  setNeedsReauth: (value: boolean) => void
  setNeedsSheetSetup: (value: boolean) => void
}

/** Wires token renewal, the 401 «sign in again» request and sign-out into the app shell. */
export function useSessionRenewal({
  clientId,
  loggedIn,
  startupDoneRef,
  setLoggedIn,
  setNeedsReauth,
  setNeedsSheetSetup
}: UseSessionRenewalOptions): void {
  const registerHandlers = useAppStore(state => state.registerHandlers)

  const handleLogout = useCallback(() => {
    setLoggedIn(false)
    setNeedsReauth(false)
    setNeedsSheetSetup(false)
  }, [setLoggedIn, setNeedsReauth, setNeedsSheetSetup])

  const handleReauth = useCallback(async () => {
    if (!startupDoneRef.current) return
    // The refresh fetches Google's script itself if it is not loaded yet.
    if (hasStoredSession()) {
      const refreshed = await refreshAccessTokenSilently(clientId)

      if (refreshed && isTokenValid()) {
        setNeedsReauth(false)

        return
      }
      // Offline is not an expired session: keep the screen the user is on.
      if (lastRefreshWasTransient()) return
    }
    setNeedsReauth(true)
  }, [clientId, setNeedsReauth, startupDoneRef])

  useEffect(() => {
    registerHandlers({ onReauth: handleReauth, onLogout: handleLogout })
  }, [handleLogout, handleReauth, registerHandlers])

  useTokenRefresh({
    clientId,
    enabled: hasStoredSession(),
    onRefreshFailed: () => {
      if (loggedIn) setNeedsReauth(true)
    },
    onRefreshSuccess: () => {
      if (isTokenValid()) setNeedsReauth(false)
    }
  })
}
