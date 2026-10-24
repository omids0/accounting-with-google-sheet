import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FULL_GOOGLE_OAUTH_SCOPE, createSession, getSession, saveSession } from './auth'
import { resetRefreshStatus } from './refreshStatus'
import {
  TRANSIENT_COOLDOWN_MS,
  WORKER_RETRY_DELAYS_MS,
  lastRefreshWasTransient,
  refreshAccessTokenSilently,
  usesAuthWorkerRefresh
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

  it('renews through a plain request, with no Google popup, when the session has a worker id', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockResolvedValue(refreshed())

    expect(usesAuthWorkerRefresh()).toBe(true)
    await expect(refreshAccessTokenSilently('client')).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(`${WORKER}/refresh`)
    expect(initTokenClient).not.toHaveBeenCalled()

    const session = getSession()

    expect(session?.accessToken).toBe('worker-token')
    expect(session?.tokenExpiry).toBeGreaterThan(Date.now() + 3_000_000)
    expect(session?.authSessionId).toBe(SESSION_ID)
  })

  it('keeps the old popup renewal when the env var is unset, even for a worker session', async () => {
    vi.stubEnv('VITE_AUTH_WORKER_URL', '')
    seedSession(SESSION_ID)

    expect(usesAuthWorkerRefresh()).toBe(false)

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(5_000)
    await pending

    expect(initTokenClient).toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the old popup renewal for a session without a worker id', async () => {
    seedSession()

    expect(usesAuthWorkerRefresh()).toBe(false)

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(5_000)
    await pending

    expect(initTokenClient).toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('on 401 invalid_grant drops the worker id and reports the session as expired', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockResolvedValue(reply({ error: 'invalid_grant' }, 401))

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(lastRefreshWasTransient()).toBe(false)
    expect(getSession()?.authSessionId).toBeUndefined()
    // The login itself stays so the expired screen can say the data is still here.
    expect(getSession()?.email).toBe('a@example.com')
    expect(usesAuthWorkerRefresh()).toBe(false)
  })

  it('retries a network error with backoff and keeps the session when it never recovers', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(WORKER_RETRY_DELAYS_MS[0])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(WORKER_RETRY_DELAYS_MS[1])

    await expect(pending).resolves.toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(lastRefreshWasTransient()).toBe(true)
    expect(getSession()?.authSessionId).toBe(SESSION_ID)
    expect(getSession()?.accessToken).toBe('old-token')
  })

  it('recovers when the network comes back during the backoff', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(refreshed())

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(WORKER_RETRY_DELAYS_MS[0])

    await expect(pending).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getSession()?.accessToken).toBe('worker-token')
    expect(lastRefreshWasTransient()).toBe(false)
  })

  it('does not ask the worker while offline and does not wait: the session is kept', async () => {
    seedSession(SESSION_ID)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(lastRefreshWasTransient()).toBe(true)
    expect(getSession()?.authSessionId).toBe(SESSION_ID)
  })

  it('treats a worker answer of "fatal" (Google refuses the client) as a dead session', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockResolvedValue(reply({ error: 'fatal' }, 401))

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)
    expect(lastRefreshWasTransient()).toBe(false)
    expect(getSession()?.authSessionId).toBeUndefined()
  })

  it('treats a misconfigured worker as a dead session instead of retrying for ever', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockResolvedValue(reply({ error: 'misconfigured' }, 500))

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)
    expect(lastRefreshWasTransient()).toBe(false)
    expect(getSession()?.authSessionId).toBeUndefined()
  })

  it('treats a server error like a network error: retried, session kept', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockResolvedValue(reply({ error: 'upstream' }, 502))

    const pending = refreshAccessTokenSilently('client')

    await vi.advanceTimersByTimeAsync(WORKER_RETRY_DELAYS_MS[0] + WORKER_RETRY_DELAYS_MS[1])

    await expect(pending).resolves.toBe(false)
    expect(lastRefreshWasTransient()).toBe(true)
    expect(getSession()?.authSessionId).toBe(SESSION_ID)
  })

  it('does not store a token that lost the drive.file scope', async () => {
    seedSession(SESSION_ID)
    fetchMock.mockResolvedValue(refreshed('openid email'))

    await expect(refreshAccessTokenSilently('client')).resolves.toBe(false)
    expect(getSession()?.accessToken).toBe('old-token')
    expect(lastRefreshWasTransient()).toBe(false)
  })
})
