import { useCallback, useEffect, useRef } from 'react'

import { useGoogleIdentityScript } from './useGoogleIdentityScript'
import { FULL_GOOGLE_OAUTH_SCOPE } from '../services/auth'
import { isNativePlatform } from '../services/googleAuthNative'

interface UseGoogleCodeLoginOptions {
  /** Google's one-time authorization code; the token-refresh worker trades it for tokens. */
  onCode: (code: string) => void
  /** The user closed the popup, refused consent, or Google answered with an error. */
  onError: () => void
  /** Fetch Google's script now; false keeps the hook idle (the token flow is in use). */
  load?: boolean
}

/**
 * Web sign-in through Google's authorization-code popup. Unlike the token popup it
 * also yields a refresh token (kept by the worker), so the app can renew its access
 * token without opening any window later.
 */
export function useGoogleCodeLogin({ onCode, onError, load = true }: UseGoogleCodeLoginOptions) {
  const ready = useGoogleIdentityScript(load && !isNativePlatform())

  const clientRef = useRef<GoogleCodeClient | null>(null)

  const handlersRef = useRef({ onCode, onError })

  handlersRef.current = { onCode, onError }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
    const oauth2 = window.google?.accounts?.oauth2

    if (!load || !ready || !clientId || !oauth2?.initCodeClient) return

    clientRef.current = oauth2.initCodeClient({
      client_id: clientId,
      scope: FULL_GOOGLE_OAUTH_SCOPE,
      ux_mode: 'popup',
      // Ask for drive.file only; older broad grants must not ride along.
      include_granted_scopes: false,
      callback: response => {
        if (response.error || !response.code) {
          handlersRef.current.onError()

          return
        }
        handlersRef.current.onCode(response.code)
      },
      error_callback: () => handlersRef.current.onError()
    })
  }, [load, ready])

  /** Call straight from the click handler, or the browser blocks Google's popup. */
  const login = useCallback(() => {
    if (clientRef.current) clientRef.current.requestCode()
    else handlersRef.current.onError()
  }, [])

  return { login, ready: load && ready }
}
