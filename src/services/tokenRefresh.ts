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
import { lastRefreshWasTransient, recordRefreshOutcome, type RefreshOutcome } from './refreshStatus'

export { lastRefreshWasTransient, type RefreshOutcome } from './refreshStatus'

/** Pause before the single retry when Google's script could not be fetched. */
export const RETRY_DELAY_MS = 800

/** The worker is a plain fetch: a network blip gets one quick retry. */
export const WORKER_RETRY_DELAYS_MS = [1_000] as const

/**
 * Only an attempt that failed fast (a network error) is retried. One that ran into the 8 s
 * request timeout is not, so a whole renewal run stays near 12 s instead of blocking the
 * API call behind it for half a minute.
 */
export const RETRY_ONLY_IF_FAST_MS = 3_000

/** After a transient failure, calls that are not forced wait this long before asking again. */
export const TRANSIENT_COOLDOWN_MS = 10_000

let refreshInFlight: Promise<boolean> | null = null

let lastTransientAt = 0

/** True right after a renewal got no answer: another attempt now would fail the same way. */
function inTransientCooldown(): boolean {
  return lastRefreshWasTransient() && Date.now() - lastTransientAt < TRANSIENT_COOLDOWN_MS
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Runs `attempt`, retrying after each pause in `delaysMs` while the outcome is transient. */
export async function attemptWithRetry(
  attempt: () => Promise<RefreshOutcome>,
  delaysMs: readonly number[]
): Promise<RefreshOutcome> {
  let startedAt = Date.now()

  let outcome = await attempt()

  for (const delay of delaysMs) {
    // Offline a retry cannot help; the caller reschedules when the browser is back. A slow
    // failure was a timeout, which a retry would only repeat.
    if (outcome !== 'transient' || isOffline()) break
    if (Date.now() - startedAt > RETRY_ONLY_IF_FAST_MS) break
    await sleep(delay)
    startedAt = Date.now()
    outcome = await attempt()
  }

  return outcome
}

/**
 * Google's silent popup request, as it always was: any answer from Google (an error
 * type, a refusal, a closed popup) means the session needs the user, never "offline".
 */
function requestTokenSilently(clientId: string, email: string): Promise<RefreshOutcome> {
  return new Promise(resolve => {
    const google = window.google?.accounts?.oauth2

    if (!google) {
      resolve('transient')

      return
    }

    let settled = false

    const finish = (outcome: RefreshOutcome) => {
      if (settled) return
      settled = true
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
        renewSessionToken(response.access_token, response.expires_in ?? 3600)
        finish('ok')
      },
      error_callback: () => finish('denied')
    })

    client.requestAccessToken({ prompt: 'none' })
  })
}

async function renewThroughGoogleScript(clientId: string, email: string): Promise<RefreshOutcome> {
  if (isOffline()) return 'transient'

  // Only a script that cannot be fetched counts as a network failure.
  const loaded = await loadGoogleIdentityScript()

  return loaded ? requestTokenSilently(clientId, email) : 'transient'
}

/** True when this login renews through the refresh-token worker instead of Google's popup. */
export function usesAuthWorkerRefresh(): boolean {
  return !!getSession()?.authSessionId && isAuthWorkerEnabled()
}

async function renewThroughWorker(
  sessionId: string,
  popupFallback: () => Promise<RefreshOutcome>
): Promise<RefreshOutcome> {
  if (isOffline()) return 'transient'

  const result = await refreshViaWorker(sessionId)

  if (result.status === 'transient') return 'transient'

  // A sign-in made while this request was in flight owns the session now; this answer
  // belongs to the old one and must neither renew nor clear the new one.
  const stillCurrent = () => getSession()?.authSessionId === sessionId

  if (result.status === 'invalid') {
    // The refresh token is gone or revoked: only a new sign-in helps.
    if (!stillCurrent()) return 'ok'
    clearAuthSessionId()

    return 'denied'
  }

  // The worker itself is broken (wrong client secret or encryption key). That is the
  // owner's mistake, not the user's session: keep the session and renew the old way.
  if (result.status === 'broken') return popupFallback()

  if (!stillCurrent()) return 'ok'
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
    if (outcome === 'transient') lastTransientAt = Date.now()
    recordRefreshOutcome(outcome)

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
    recordRefreshOutcome('denied')

    return Promise.resolve(false)
  }

  if (!force && isTokenValid() && !shouldRefreshToken()) {
    return Promise.resolve(true)
  }

  // Right after "nothing answered", other callers (each API call) do not queue up
  // behind another doomed attempt; the refresh timer and the `online` event retry.
  if (!force && inTransientCooldown()) {
    return Promise.resolve(false)
  }

  if (isNativePlatform()) {
    refreshInFlight = refreshNativeToken().then(accessToken => {
      refreshInFlight = null

      if (!accessToken) {
        recordRefreshOutcome('denied')

        return false
      }
      renewSessionToken(accessToken)
      recordRefreshOutcome('ok')

      return true
    })

    return refreshInFlight
  }

  // No popup and no Google script: a plain request the browser cannot block.
  if (session.authSessionId && isAuthWorkerEnabled()) {
    const sessionId = session.authSessionId

    const email = session.email

    return runRefresh(
      () => renewThroughWorker(sessionId, () => renewThroughGoogleScript(clientId, email)),
      WORKER_RETRY_DELAYS_MS
    )
  }

  if (!clientId) {
    recordRefreshOutcome('denied')

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
  // A rejected API call right after "nothing answered" gets the same answer, not a new try.
  if (inTransientCooldown()) return Promise.resolve(false)

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
