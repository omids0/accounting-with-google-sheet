import { useCallback, useEffect, useRef } from 'react'

import { useGoogleIdentityScript } from './useGoogleIdentityScript'
import { FULL_GOOGLE_OAUTH_SCOPE } from '../services/auth'
import { isNativePlatform } from '../services/googleAuthNative'

export interface GoogleTokenGrant {
  access_token: string
  expires_in?: number
  /** Space-separated scopes the user actually granted. */
  scope: string
}

interface UseGoogleTokenLoginOptions {
  onSuccess: (grant: GoogleTokenGrant) => void
  /** The user closed the popup, refused consent, or Google answered with an error. */
  onError: () => void
  prompt?: string
  hint?: string
  includeGrantedScopes?: boolean
  /** Fetch Google's script now; false defers it until the flow is about to be used. */
  load?: boolean
}

/**
 * Interactive web sign-in (Google's token popup) without a provider at the app
 * root, so the script loads only on screens that may sign in. On the APK it
 * never loads; callers sign in through the native plugin there.
 */
export function useGoogleTokenLogin({
  onSuccess,
  onError,
  prompt,
  hint,
  includeGrantedScopes,
  load = true
}: UseGoogleTokenLoginOptions) {
  const ready = useGoogleIdentityScript(load && !isNativePlatform())

  const clientRef = useRef<GoogleTokenClient | null>(null)

  const handlersRef = useRef({ onSuccess, onError })

  handlersRef.current = { onSuccess, onError }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
    const oauth2 = window.google?.accounts?.oauth2

    if (!ready || !clientId || !oauth2) return

    clientRef.current = oauth2.initTokenClient({
      client_id: clientId,
      scope: FULL_GOOGLE_OAUTH_SCOPE,
      prompt,
      hint,
      include_granted_scopes: includeGrantedScopes,
      callback: response => {
        if (response.error || !response.access_token) {
          handlersRef.current.onError()

          return
        }
        handlersRef.current.onSuccess({
          access_token: response.access_token,
          expires_in: response.expires_in,
          scope: response.scope ?? ''
        })
      },
      error_callback: () => handlersRef.current.onError()
    })
  }, [ready, prompt, hint, includeGrantedScopes])

  /** Call straight from the click handler, or the browser blocks Google's popup. */
  const login = useCallback(() => clientRef.current?.requestAccessToken(), [])

  return { login, ready }
}
