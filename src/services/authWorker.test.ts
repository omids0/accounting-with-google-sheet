import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AuthWorkerUnavailableError,
  authWorkerUrl,
  exchangeAuthCode,
  forgetWorkerSession,
  isAuthWorkerEnabled,
  logoutViaWorker,
  refreshViaWorker
} from './authWorker'

const native = { value: false }

vi.mock('./googleAuthNative', () => ({ isNativePlatform: () => native.value }))

const SESSION_ID = 'A'.repeat(43)

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const fetchMock = vi.fn()

function lastCall(): { url: string; body: Record<string, unknown>; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]

  return { url, init, body: JSON.parse(init.body as string) }
}

describe('authWorker', () => {
  beforeEach(() => {
    native.value = false
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_AUTH_WORKER_URL', 'https://auth.example.workers.dev/')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('is off when the env var is unset, blank or not an http address', () => {
    for (const value of ['', '   ', 'auth.example.workers.dev']) {
      vi.stubEnv('VITE_AUTH_WORKER_URL', value)
      expect(authWorkerUrl()).toBe('')
      expect(isAuthWorkerEnabled()).toBe(false)
    }
  })

  it('is on for the web with the address trimmed of trailing slashes, off in the APK', () => {
    expect(authWorkerUrl()).toBe('https://auth.example.workers.dev')
    expect(isAuthWorkerEnabled()).toBe(true)

    native.value = true
    expect(isAuthWorkerEnabled()).toBe(false)
  })

  it('exchanges a code and returns the grant with its session id', async () => {
    fetchMock.mockResolvedValue(
      reply({
        access_token: 'access',
        expires_in: 3599,
        scope: 'openid drive',
        sessionId: SESSION_ID,
        email: 'a@example.com'
      })
    )

    await expect(exchangeAuthCode('the-code')).resolves.toEqual({
      access_token: 'access',
      expires_in: 3599,
      scope: 'openid drive',
      sessionId: SESSION_ID,
      email: 'a@example.com'
    })

    const { url, body, init } = lastCall()

    expect(url).toBe('https://auth.example.workers.dev/exchange')
    expect(body).toEqual({ code: 'the-code' })
    expect(init.credentials).toBe('omit')
  })

  it('accepts a grant without a session id (Google sent no refresh token)', async () => {
    fetchMock.mockResolvedValue(reply({ access_token: 'access', scope: 's' }))

    const grant = await exchangeAuthCode('c')

    expect(grant.sessionId).toBeUndefined()
    expect(grant.expires_in).toBe(3600)
  })

  it('explains an expired code, a worker error and no connection in Persian', async () => {
    fetchMock.mockImplementation(async () => reply({ error: 'invalid_grant' }, 400))
    await expect(exchangeAuthCode('c')).rejects.toThrow('کد ورود منقضی شد')
    await expect(exchangeAuthCode('c')).rejects.not.toBeInstanceOf(AuthWorkerUnavailableError)

    fetchMock.mockResolvedValue(reply({ error: 'upstream' }, 502))
    await expect(exchangeAuthCode('c')).rejects.toThrow('سرور ورود پاسخ نداد')

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(exchangeAuthCode('c')).rejects.toThrow('اتصال به سرور ورود برقرار نشد')
  })

  it('marks an unreachable or broken worker so sign-in can fall back to the token flow', async () => {
    for (const make of [
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(reply({ error: 'upstream' }, 502)),
      () => Promise.resolve(reply({ error: 'misconfigured' }, 500)),
      () => Promise.resolve(reply({ error: 'forbidden' }, 403))
    ]) {
      fetchMock.mockImplementation(make)
      await expect(exchangeAuthCode('c')).rejects.toBeInstanceOf(AuthWorkerUnavailableError)
    }
  })

  it('renews an access token', async () => {
    fetchMock.mockResolvedValue(reply({ access_token: 'new', expires_in: 3500, scope: 'drive' }))

    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({
      status: 'ok',
      accessToken: 'new',
      expiresIn: 3500,
      scope: 'drive'
    })
    expect(lastCall().url).toBe('https://auth.example.workers.dev/refresh')
    expect(lastCall().body).toEqual({ sessionId: SESSION_ID })
  })

  it('reports 401 as invalid and everything else that fails as transient', async () => {
    fetchMock.mockResolvedValue(reply({ error: 'invalid_grant' }, 401))
    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({ status: 'invalid' })

    fetchMock.mockResolvedValue(reply({ error: 'upstream' }, 502))
    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({ status: 'transient' })

    // A deployment mistake is not the user's session: the caller renews another way.
    fetchMock.mockResolvedValue(reply({ error: 'fatal' }, 401))
    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({ status: 'broken' })

    fetchMock.mockResolvedValue(reply({ error: 'misconfigured' }, 500))
    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({ status: 'broken' })

    fetchMock.mockResolvedValue(reply({ error: 'misconfigured' }, 401))
    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({ status: 'broken' })

    fetchMock.mockResolvedValue(reply({ error: 'forbidden' }, 403))
    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({ status: 'transient' })

    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }))
    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({ status: 'transient' })

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(refreshViaWorker(SESSION_ID)).resolves.toEqual({ status: 'transient' })
  })

  it('logs out through the worker and never throws, even offline', async () => {
    fetchMock.mockResolvedValue(reply({ ok: true }))
    await logoutViaWorker(SESSION_ID)

    expect(lastCall().url).toBe('https://auth.example.workers.dev/logout')
    expect(lastCall().body).toEqual({ sessionId: SESSION_ID })

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(logoutViaWorker(SESSION_ID)).resolves.toBeUndefined()
  })

  it('can forget a session without revoking it at Google', async () => {
    fetchMock.mockResolvedValue(reply({ ok: true }))
    await forgetWorkerSession(SESSION_ID)

    expect(lastCall().url).toBe('https://auth.example.workers.dev/logout')
    expect(lastCall().body).toEqual({ sessionId: SESSION_ID, revoke: false })
  })
})
