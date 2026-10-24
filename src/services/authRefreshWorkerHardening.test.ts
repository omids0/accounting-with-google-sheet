import { describe, expect, it, vi } from 'vitest'

import {
  DRIVE_SCOPE,
  SECRET_REFRESH_TOKEN,
  exchange,
  googleReply,
  makeEnv,
  post
} from './authRefreshWorkerKit'
import { newSessionId } from '../../workers/auth-refresh/src/crypto'
import { TOUCH_AFTER_MS } from '../../workers/auth-refresh/src/handlers'
import { handleRequest } from '../../workers/auth-refresh/src/index'

const withToken = () =>
  vi.fn(async () =>
    googleReply({ access_token: 'a', scope: DRIVE_SCOPE, refresh_token: SECRET_REFRESH_TOKEN })
  )

async function signedIn() {
  const env = makeEnv()

  const { body } = await exchange(env, withToken())

  return { env, sessionId: body.sessionId as string }
}

describe('worker: sessions Google gave without drive.file', () => {
  it('stores nothing and returns no session id when drive.file was left unticked', async () => {
    const env = makeEnv()

    const { response, body } = await exchange(
      env,
      vi.fn(async () =>
        googleReply({ access_token: 'a', scope: 'openid email', refresh_token: 'r' })
      )
    )

    expect(response.status).toBe(200)
    expect(body.sessionId).toBeUndefined()
    expect(env.AUTH_KV.store.size).toBe(0)
  })
})

describe('worker: refresh', () => {
  it('keeps a session whose Google refusal will not fix itself, but tells the app to drop it', async () => {
    for (const error of ['invalid_client', 'unauthorized_client', 'invalid_request']) {
      const { env, sessionId } = await signedIn()

      const response = await handleRequest(
        post('/refresh', { sessionId }),
        env,
        vi.fn(async () => googleReply({ error }, 400))
      )

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'fatal' })
      expect(env.AUTH_KV.store.size).toBe(1)
    }
  })

  it('treats Google rate limiting and server errors as temporary', async () => {
    for (const status of [429, 500, 503]) {
      const { env, sessionId } = await signedIn()

      const response = await handleRequest(
        post('/refresh', { sessionId }),
        env,
        vi.fn(async () => googleReply({ error: 'x' }, status))
      )

      expect(response.status).toBe(502)
    }
  })

  it('does not delete anything when the entry is not visible yet (KV is eventually consistent)', async () => {
    const env = makeEnv()

    const del = vi.spyOn(env.AUTH_KV, 'delete')

    const response = await handleRequest(
      post('/refresh', { sessionId: newSessionId() }),
      env,
      vi.fn()
    )

    expect(response.status).toBe(401)
    expect(del).not.toHaveBeenCalled()
  })

  it('still renews when pushing the entry expiry out fails', async () => {
    const { env, sessionId } = await signedIn()

    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + TOUCH_AFTER_MS + 1000)
    env.AUTH_KV.put = async () => {
      throw new Error('KV write limit reached')
    }

    const response = await handleRequest(
      post('/refresh', { sessionId }),
      env,
      vi.fn(async () =>
        googleReply({ access_token: 'fresh', expires_in: 3599, scope: DRIVE_SCOPE })
      )
    )

    vi.useRealTimers()
    expect(response.status).toBe(200)
    expect(((await response.json()) as { access_token: string }).access_token).toBe('fresh')
  })
})

describe('worker: logout without revoking', () => {
  it('only deletes the stored copy when revoke is false', async () => {
    const { env, sessionId } = await signedIn()

    const fetchFn = vi.fn()

    const response = await handleRequest(
      post('/logout', { sessionId, revoke: false }),
      env,
      fetchFn
    )

    expect(response.status).toBe(200)
    expect(fetchFn).not.toHaveBeenCalled()
    expect(env.AUTH_KV.store.size).toBe(0)
  })
})

describe('worker: rate limiting binding', () => {
  it('answers 429 when the optional limiter says no, keyed by caller and route', async () => {
    const limit = vi.fn(async () => ({ success: false }))

    const env = { ...makeEnv(), RATE_LIMITER: { limit } }

    const response = await handleRequest(
      new Request('https://auth.example.workers.dev/refresh', {
        method: 'POST',
        headers: {
          Origin: 'https://omids0.github.io',
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.7'
        },
        body: JSON.stringify({ sessionId: 'A'.repeat(43) })
      }),
      env,
      vi.fn()
    )

    expect(response.status).toBe(429)
    expect(limit).toHaveBeenCalledWith({ key: '203.0.113.7/refresh' })
  })

  it('works without the binding and when the limiter itself fails', async () => {
    const env = {
      ...makeEnv(),
      RATE_LIMITER: {
        limit: async () => {
          throw new Error('down')
        }
      }
    }

    const response = await handleRequest(
      post('/refresh', { sessionId: 'A'.repeat(43) }),
      env,
      vi.fn()
    )

    expect(response.status).toBe(401)
  })
})
