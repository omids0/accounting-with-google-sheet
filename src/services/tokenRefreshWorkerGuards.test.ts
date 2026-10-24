import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FULL_GOOGLE_OAUTH_SCOPE, createSession, getSession, saveSession } from './auth'
import { getTransientStreak, resetRefreshStatus } from './refreshStatus'
import {
  TRANSIENT_COOLDOWN_MS,
  forceRefreshAccessToken,
  lastRefreshWasTransient,
  refreshAccessTokenSilently
} from './tokenRefresh'

vi.mock('./googleAuthNative', () => ({
  isNativePlatform: () => false,
  refreshNativeToken: vi.fn()
}))

vi.mock('./googleIdentityScript', () => ({ loadGoogleIdentityScript: async () => true }))

const SESSION_ID = 'B'.repeat(43)

const WORKER = 'https://auth.example.workers.dev'

const fetchMock = vi.fn()

const initTokenClient = vi.fn()

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const refreshed = (scope = FULL_GOOGLE_OAUTH_SCOPE) =>
  reply({ access_token: 'worker-token', expires_in: 3599, scope })

function seedSession(authSessionId?: string): void {
  saveSession({
    ...createSession(
      'old-token',
      { email: 'a@example.com', name: 'A' },
      3600,
      FULL_GOOGLE_OAUTH_SCOPE,
      authSessionId
    ),
    tokenExpiry: Date.now() - 1000
  })
}

let clock = Date.now()

describe('refreshAccessTokenSilently (refresh-token worker)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // The cool-down after a transient failure is module state; every test starts later.
    clock += TRANSIENT_COOLDOWN_MS * 10
    vi.setSystemTime(clock)
    resetRefreshStatus()
    localStorage.clear()
    fetchMock.mockReset()
    initTokenClient.mockReset()
    // Google's popup, if it were used, is closed at once.
    initTokenClient.mockImplementation(
      (config: { error_callback: (e: { type: string }) => void }) => ({
        requestAccessToken: () => config.error_callback({ type: 'popup_closed' })
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_AUTH_WORKER_URL', WORKER)
    window.google = { accounts: { oauth2: { initTokenClient } } } as unknown as Window['google']
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    delete window.google
  })

  it.each([
    ['fatal', 401],
    ['misconfigured', 401],
    ['misconfigured', 500]
  ])(
    'keeps the session and renews the old way when the worker says "%s" (%i)',
    async (error, status) => {
      seedSession(SESSION_ID)
      fetchMock.mockResolvedValue(reply({ error }, status))

      await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)

      // A deployment mistake must not sign everybody out.
      expect(getSession()?.authSessionId).toBe(SESSION_ID)
      expect(initTokenClient).toHaveBeenCalled()
      expect(lastRefreshWasTransient()).toBe(false)
    }
  )

  it('uses the popup renewal for that attempt and succeeds when Google answers', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockResolvedValue(reply({ error: 'fatal' }, 401))
    initTokenClient.mockImplementation(
      (config: { callback: (r: GoogleTokenResponse) => void }) => ({
        requestAccessToken: () =>
          config.callback({
            access_token: 'popup-token',
            expires_in: 3600,
            scope: FULL_GOOGLE_OAUTH_SCOPE
          })
      })
    )

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(true)
    expect(getSession()?.accessToken).toBe('popup-token')
    expect(getSession()?.authSessionId).toBe(SESSION_ID)
  })

  it('does not clear a newer sign-in when the old session is reported dead mid-flight', async () => {
    seedSession(SESSION_ID)

    let answer: (response: Response) => void = () => undefined

    fetchMock.mockImplementation(() => new Promise<Response>(resolve => (answer = resolve)))

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(0)
    seedSession('C'.repeat(43))
    answer(reply({ error: 'invalid_grant' }, 401))

    await expect(pending).resolves.toBe(true)
    expect(getSession()?.authSessionId).toBe('C'.repeat(43))
  })

  it('does not write an old session token into a newer sign-in', async () => {
    seedSession(SESSION_ID)

    let answer: (response: Response) => void = () => undefined

    fetchMock.mockImplementation(() => new Promise<Response>(resolve => (answer = resolve)))

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(0)
    seedSession('C'.repeat(43))
    answer(refreshed())
    await pending

    expect(getSession()?.accessToken).toBe('old-token')
  })

  it('a rejected API call right after "no answer" gets the same answer, not a new attempt', async () => {
    seedSession(SESSION_ID)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await refreshAccessTokenSilently('client')
    vi.restoreAllMocks()
    fetchMock.mockResolvedValue(refreshed())

    await expect(forceRefreshAccessToken()).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(TRANSIENT_COOLDOWN_MS)
    await expect(forceRefreshAccessToken()).resolves.toBe(true)
  })

  it('counts only the refresh timer in the backoff streak, not API-driven attempts', async () => {
    seedSession(SESSION_ID)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    await refreshAccessTokenSilently('client')
    await refreshAccessTokenSilently('client', true)

    expect(getTransientStreak()).toBe(0)
  })
})
