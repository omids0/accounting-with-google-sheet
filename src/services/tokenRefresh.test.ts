import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FULL_GOOGLE_OAUTH_SCOPE, getSession, saveSession } from './auth'
import {
  RETRY_DELAY_MS,
  SILENT_REQUEST_DEADLINE_MS,
  lastRefreshWasTransient,
  refreshAccessTokenSilently
} from './tokenRefresh'

const scriptLoads = vi.fn(async () => true)

vi.mock('./googleAuthNative', () => ({
  isNativePlatform: () => false,
  refreshNativeToken: vi.fn()
}))

vi.mock('./googleIdentityScript', () => ({ loadGoogleIdentityScript: () => scriptLoads() }))

type Config = {
  callback: (response: GoogleTokenResponse) => void
  error_callback?: (error: { type: string }) => void
}

/** Each request to Google is answered by the next function of this queue (none = no answer). */
let answers: Array<(config: Config) => void> = []

const requests = vi.fn()

function installGoogle(): void {
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (config: Config) => ({
          requestAccessToken: () => {
            requests()
            answers.shift()?.(config)
          }
        })
      }
    }
  } as unknown as Window['google']
}

const popupBlocked = (config: Config) => config.error_callback?.({ type: 'popup_failed_to_open' })

const popupClosed = (config: Config) => config.error_callback?.({ type: 'popup_closed' })

const grant = (config: Config) =>
  config.callback({ access_token: 'new-token', expires_in: 3600, scope: FULL_GOOGLE_OAUTH_SCOPE })

describe('refreshAccessTokenSilently (Google script path)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    saveSession({
      email: 'a@example.com',
      name: 'A',
      accessToken: 'old-token',
      tokenExpiry: Date.now() - 1000,
      scope: FULL_GOOGLE_OAUTH_SCOPE
    })
    answers = []
    requests.mockClear()
    scriptLoads.mockResolvedValue(true)
    installGoogle()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete window.google
  })

  it('stores the new token when Google answers', async () => {
    answers = [grant]

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(true)
    expect(getSession()?.accessToken).toBe('new-token')
    expect(lastRefreshWasTransient()).toBe(false)
  })

  it('does not retry a popup the browser blocked and calls the session expired', async () => {
    answers = [popupBlocked, grant]

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)
    expect(requests).toHaveBeenCalledTimes(1)
    expect(lastRefreshWasTransient()).toBe(false)
  })

  it('retries once after a transient failure and recovers without bothering the user', async () => {
    answers = [popupClosed, grant]

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS)

    await expect(pending).resolves.toBe(true)
    expect(requests).toHaveBeenCalledTimes(2)
    expect(getSession()?.accessToken).toBe('new-token')
  })

  it('reports a failure that stays transient as offline, not as an expired session', async () => {
    answers = [popupClosed, popupClosed]

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS)

    await expect(pending).resolves.toBe(false)
    expect(requests).toHaveBeenCalledTimes(2)
    expect(lastRefreshWasTransient()).toBe(true)
    // The stored session is untouched: offline must never log the user out.
    expect(getSession()?.email).toBe('a@example.com')
  })

  it('treats a script that cannot load as transient', async () => {
    scriptLoads.mockResolvedValue(false)
    delete window.google

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS)

    await expect(pending).resolves.toBe(false)
    expect(lastRefreshWasTransient()).toBe(true)
  })

  it('gives up on a request that never answers after the deadline', async () => {
    answers = []

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(SILENT_REQUEST_DEADLINE_MS)

    await expect(pending).resolves.toBe(false)
    expect(lastRefreshWasTransient()).toBe(false)
  })
})
