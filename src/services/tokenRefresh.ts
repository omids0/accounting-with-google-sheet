import {
  FULL_GOOGLE_OAUTH_SCOPE,
  clearAuthSessionId,
  getSession,
  hasRequiredGoogleScopes,
  isTokenValid,
  renewSessionToken,
  sessionNeedsScopeUpgrade,
  shouldRefreshToken
} from './auth'
import { isAuthWorkerEnabled, refreshViaWorker } from './authWorker'
import { isNativePlatform, refreshNativeToken } from './googleAuthNative'
import { loadGoogleIdentityScript } from './googleIdentityScript'

/**
 * `ok`: a new token is stored. `denied`: Google (or the browser) refused, so only
 * the user can fix it. `transient`: no answer (offline, script or network error),
 * so the session may well be fine and must not be called expired.
 */
export type RefreshOutcome = 'ok' | 'denied' | 'transient'

/** A silent request that has not answered by now is given up, so start-up never waits long. */
export const SILENT_REQUEST_DEADLINE_MS = 4_000

/** Pause before the single retry of a transient web failure. */
export const RETRY_DELAY_MS = 800

/** The worker is a plain fetch, so a network blip gets two more tries with growing pauses. */
export const WORKER_RETRY_DELAYS_MS = [1_000, 3_000] as const

let refreshInFlight: Promise<boolean> | null = null

let lastOutcome: RefreshOutcome = 'ok'

/** True when the last renewal failed only because nothing answered (offline). */
export function lastRefreshWasTransient(): boolean {
  return lastOutcome === 'transient'
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Runs `attempt`, retrying after each pause in `delaysMs` while the outcome is transient. */
export async function attemptWithRetry(
  attempt: () => Promise<RefreshOutcome>,
  delaysMs: readonly number[]
): Promise<RefreshOutcome> {
  let outcome = await attempt()

  for (const delay of delaysMs) {
    if (outcome !== 'transient') break
    await sleep(delay)
    outcome = await attempt()
  }

  return outcome
}

function requestTokenSilently(clientId: string, email: string): Promise<RefreshOutcome> {
  return new Promise(resolve => {
    const google = window.google?.accounts?.oauth2

    if (!google) {
      resolve('transient')

      return
    }

    let settled = false

    // A popup that opened but never answers must not hold the splash screen.
    const timer = setTimeout(() => finish('denied'), SILENT_REQUEST_DEADLINE_MS)

    function finish(outcome: RefreshOutcome) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(outcome)
    }

    const client = google.initTokenClient({
      client_id: clientId,
      scope: FULL_GOOGLE_OAUTH_SCOPE,
      // Only the scopes asked for here, not every scope this client ever got.
      include_granted_scopes: false,
      hint: email,
      callback: response => {
        const scopeLost = !!response.scope && !hasRequiredGoogleScopes(response.scope)

        if (response.error || !response.access_token || scopeLost) {
          finish('denied')

          return
        }
        // Stored even when it arrives after the deadline: the next call finds it valid.
        renewSessionToken(response.access_token, response.expires_in ?? 3600)
        finish('ok')
      },
      // A popup the browser blocks fails again at once, so only other errors are retried.
      error_callback: error =>
        finish(error?.type === 'popup_failed_to_open' ? 'denied' : 'transient')
    })

    client.requestAccessToken({ prompt: 'none' })
  })
}

async function renewThroughGoogleScript(clientId: string, email: string): Promise<RefreshOutcome> {
  const loaded = await Promise.race([
    loadGoogleIdentityScript(),
    sleep(SILENT_REQUEST_DEADLINE_MS).then(() => false)
  ])

  return loaded ? requestTokenSilently(clientId, email) : 'transient'
}

/** True when this login renews through the refresh-token worker instead of Google's popup. */
export function usesAuthWorkerRefresh(): boolean {
  return !!getSession()?.authSessionId && isAuthWorkerEnabled()
}

async function renewThroughWorker(sessionId: string): Promise<RefreshOutcome> {
  const result = await refreshViaWorker(sessionId)

  if (result.status === 'transient') return 'transient'

  if (result.status === 'invalid') {
    // Google or the worker dropped the refresh token: only a new sign-in helps.
    clearAuthSessionId()

    return 'denied'
  }

  if (!hasRequiredGoogleScopes(result.scope)) return 'denied'
  renewSessionToken(result.accessToken, result.expiresIn)

  return 'ok'
}

function runRefresh(
  attempt: () => Promise<RefreshOutcome>,
  retryDelays: readonly number[]
): Promise<boolean> {
  refreshInFlight = attemptWithRetry(attempt, retryDelays).then(outcome => {
    refreshInFlight = null
    lastOutcome = outcome

    return outcome === 'ok'
  })

  return refreshInFlight
}

export function refreshAccessTokenSilently(clientId: string, force = false): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  const session = getSession()

  // Old-scope sessions never got drive.file; a silent request cannot add it, so
  // send them straight to the one-time sign-in instead of failing at Google.
  if (!session?.email || sessionNeedsScopeUpgrade()) {
    lastOutcome = 'denied'

    return Promise.resolve(false)
  }

  if (!force && isTokenValid() && !shouldRefreshToken()) {
    return Promise.resolve(true)
  }

  if (isNativePlatform()) {
    refreshInFlight = refreshNativeToken().then(accessToken => {
      refreshInFlight = null

      if (!accessToken) {
        lastOutcome = 'denied'

        return false
      }
      renewSessionToken(accessToken)
      lastOutcome = 'ok'

      return true
    })

    return refreshInFlight
  }

  // No popup and no Google script: a plain request the browser cannot block.
  if (session.authSessionId && isAuthWorkerEnabled()) {
    const sessionId = session.authSessionId

    return runRefresh(() => renewThroughWorker(sessionId), WORKER_RETRY_DELAYS_MS)
  }

  if (!clientId) {
    lastOutcome = 'denied'

    return Promise.resolve(false)
  }

  const email = session.email

  return runRefresh(() => renewThroughGoogleScript(clientId, email), [RETRY_DELAY_MS])
}

/**
 * Google can reject a token the app still considers valid — after a password
 * change or a revoked grant — so this forces a new one instead of trusting the
 * stored expiry.
 */
export function forceRefreshAccessToken(): Promise<boolean> {
  return refreshAccessTokenSilently(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '', true)
}

/**
 * Cached screens open before the token is renewed, so the first API call of a
 * session may find an expired token. Renew it here (once, shared) instead of
 * failing the call and sending the user to the login screen.
 */
export async function ensureFreshAccessToken(): Promise<boolean> {
  if (isTokenValid()) return true
  if (!getSession()?.email) return false

  return refreshAccessTokenSilently(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '')
}
