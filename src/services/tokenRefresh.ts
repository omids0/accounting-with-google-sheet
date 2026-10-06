import {
  FULL_GOOGLE_OAUTH_SCOPE,
  getSession,
  hasRequiredGoogleScopes,
  isTokenValid,
  renewSessionToken,
  sessionNeedsScopeUpgrade,
  shouldRefreshToken
} from './auth'
import { isNativePlatform, refreshNativeToken } from './googleAuthNative'

let refreshInFlight: Promise<boolean> | null = null

export function refreshAccessTokenSilently(clientId: string, force = false): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  const session = getSession()

  // Old-scope sessions never got drive.file; a silent request cannot add it, so
  // send them straight to the one-time sign-in instead of failing at Google.
  if (!session?.email || sessionNeedsScopeUpgrade()) {
    return Promise.resolve(false)
  }

  if (!force && isTokenValid() && !shouldRefreshToken()) {
    return Promise.resolve(true)
  }

  if (isNativePlatform()) {
    refreshInFlight = refreshNativeToken().then(accessToken => {
      refreshInFlight = null

      if (!accessToken) return false
      renewSessionToken(accessToken)

      return true
    })

    return refreshInFlight
  }

  if (!clientId) {
    return Promise.resolve(false)
  }

  refreshInFlight = new Promise(resolve => {
    const google = window.google?.accounts?.oauth2

    if (!google) {
      refreshInFlight = null
      resolve(false)

      return
    }

    let settled = false

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      refreshInFlight = null
      resolve(ok)
    }

    const client = google.initTokenClient({
      client_id: clientId,
      scope: FULL_GOOGLE_OAUTH_SCOPE,
      // Only the scopes asked for here, not every scope this client ever got.
      include_granted_scopes: false,
      hint: session.email,
      callback: response => {
        const scopeLost = !!response.scope && !hasRequiredGoogleScopes(response.scope)

        if (response.error || !response.access_token || scopeLost) {
          finish(false)

          return
        }
        renewSessionToken(response.access_token, response.expires_in ?? 3600)
        finish(true)
      },
      error_callback: () => finish(false)
    })

    client.requestAccessToken({ prompt: 'none' })
  })

  return refreshInFlight
}

/**
 * Google can reject a token the app still considers valid — after a password
 * change or a revoked grant — so this forces a new one instead of trusting the
 * stored expiry.
 */
export function forceRefreshAccessToken(): Promise<boolean> {
  return refreshAccessTokenSilently(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '', true)
}

const GIS_WAIT_MS = 10_000

const GIS_POLL_MS = 200

async function waitForGoogleScript(): Promise<void> {
  const deadline = Date.now() + GIS_WAIT_MS

  while (!window.google?.accounts?.oauth2 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, GIS_POLL_MS))
  }
}

/**
 * Cached screens open before the token is renewed, so the first API call of a
 * session may find an expired token. Renew it here (once, shared) instead of
 * failing the call and sending the user to the login screen.
 */
export async function ensureFreshAccessToken(): Promise<boolean> {
  if (isTokenValid()) return true
  if (!getSession()?.email) return false

  if (!isNativePlatform()) await waitForGoogleScript()

  return refreshAccessTokenSilently(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '')
}
