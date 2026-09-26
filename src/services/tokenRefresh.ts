import {
  FULL_GOOGLE_OAUTH_SCOPE,
  getSession,
  isTokenValid,
  renewSessionToken,
  shouldRefreshToken
} from './auth'
import { isNativePlatform, refreshNativeToken } from './googleAuthNative'

let refreshInFlight: Promise<boolean> | null = null

export function refreshAccessTokenSilently(clientId: string): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  const session = getSession()

  if (!session?.email) {
    return Promise.resolve(false)
  }

  if (isTokenValid() && !shouldRefreshToken()) {
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
      hint: session.email,
      callback: response => {
        if (response.error || !response.access_token) {
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
