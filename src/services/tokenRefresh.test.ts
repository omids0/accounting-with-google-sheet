import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FULL_GOOGLE_OAUTH_SCOPE, getSession, saveSession } from './auth'
import { getTransientStreak, resetRefreshStatus } from './refreshStatus'
import {
  RETRY_DELAY_MS,
  TRANSIENT_COOLDOWN_MS,
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

const errorType = (type: string) => (config: Config) => config.error_callback?.({ type })

const grant = (config: Config) =>
  config.callback({ access_token: 'new-token', expires_in: 3600, scope: FULL_GOOGLE_OAUTH_SCOPE })

let clock = Date.now()

/**
 * The old popup path (no VITE_AUTH_WORKER_URL). These tests pin it to the behaviour it has
 * on develop: any answer from Google means "sign in again", nothing is cut short by a
 * deadline, and only a script that cannot be fetched (or being offline) counts as "no answer".
 */
describe('refreshAccessTokenSilently (Google script path)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // The cool-down after a transient failure is module state; every test starts later.
    clock += TRANSIENT_COOLDOWN_MS * 10
    vi.setSystemTime(clock)
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
    scriptLoads.mockReset()
    scriptLoads.mockResolvedValue(true)
    resetRefreshStatus()
    installGoogle()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete window.google
  })

  it('stores the new token when Google answers', async () => {
    answers = [grant]

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(true)
    expect(getSession()?.accessToken).toBe('new-token')
    expect(lastRefreshWasTransient()).toBe(false)
  })

  it.each(['popup_failed_to_open', 'popup_closed', 'unknown'])(
    'calls the session expired for the Google error "%s", with no retry and no "offline"',
    async type => {
      answers = [errorType(type), grant]

      await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)
      expect(requests).toHaveBeenCalledTimes(1)
      expect(lastRefreshWasTransient()).toBe(false)
      expect(getTransientStreak()).toBe(0)
    }
  )

  it('calls the session expired when Google refuses the request or drops the scope', async () => {
    answers = [config => config.callback({ error: 'interaction_required' })]
    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)
    expect(lastRefreshWasTransient()).toBe(false)

    answers = [config => config.callback({ access_token: 't', scope: 'openid email' })]
    await expect(refreshAccessTokenSilently('client', true)).resolves.toBe(false)
    expect(getSession()?.accessToken).toBe('old-token')
  })

  it('has no deadline of its own: a slow Google answer still renews the session', async () => {
    let late: Config | undefined

    answers = [config => void (late = config)]

    let result: boolean | undefined

    void refreshAccessTokenSilently('client').then(value => (result = value))

    await vi.advanceTimersByTimeAsync(60_000)
    expect(result).toBeUndefined()

    grant(late as Config)
    await vi.advanceTimersByTimeAsync(0)
    expect(result).toBe(true)
    expect(getSession()?.accessToken).toBe('new-token')
  })

  it('treats being offline as "no answer" without asking Google or waiting', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    answers = [grant]

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)
    expect(requests).not.toHaveBeenCalled()
    expect(lastRefreshWasTransient()).toBe(true)
    expect(getSession()?.email).toBe('a@example.com')
  })

  it('retries once when the Google script cannot be fetched, then recovers', async () => {
    scriptLoads.mockResolvedValueOnce(false)
    delete window.google
    answers = [grant]

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(0)
    installGoogle()
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS)

    await expect(pending).resolves.toBe(true)
    expect(scriptLoads).toHaveBeenCalledTimes(2)
  })

  it('reports a script that never loads as "no answer", not as an expired session', async () => {
    scriptLoads.mockResolvedValue(false)
    delete window.google

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS)

    await expect(pending).resolves.toBe(false)
    expect(lastRefreshWasTransient()).toBe(true)
    expect(getTransientStreak()).toBe(1)
    expect(getSession()?.accessToken).toBe('old-token')
  })

  it('does not queue another attempt for callers right after "no answer", unless forced', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await refreshAccessTokenSilently('client')
    vi.restoreAllMocks()
    answers = [grant]

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)
    expect(requests).not.toHaveBeenCalled()

    await expect(refreshAccessTokenSilently('client', true)).resolves.toBe(true)
    expect(requests).toHaveBeenCalledTimes(1)
  })
})
