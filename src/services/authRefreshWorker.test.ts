import { describe, expect, it, vi } from 'vitest'

import {
  DRIVE_SCOPE,
  ORIGIN,
  OTHER_KEY_B64,
  SECRET_REFRESH_TOKEN,
  exchange,
  googleReply,
  idToken,
  makeEnv,
  post
} from './authRefreshWorkerKit'
import { isValidSessionId, newSessionId } from '../../workers/auth-refresh/src/crypto'
import { handleRequest } from '../../workers/auth-refresh/src/index'

describe('worker endpoints', () => {
  it('refuses an origin that is not on the list and a missing origin', async () => {
    const env = makeEnv()

    const bad = await handleRequest(post('/refresh', {}, 'https://evil.example'), env, vi.fn())

    const none = await handleRequest(post('/refresh', {}, null), env, vi.fn())

    expect(bad.status).toBe(403)
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(none.status).toBe(403)
  })

  it('answers the preflight with CORS for the allowed origin', async () => {
    const response = await handleRequest(
      new Request('https://auth.example.workers.dev/refresh', {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN }
      }),
      makeEnv(),
      vi.fn()
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
  })

  it('exchanges a code, seals the refresh token in KV and never returns it', async () => {
    const env = makeEnv()

    const fetchFn = vi.fn(async () =>
      googleReply({
        access_token: 'access-1',
        expires_in: 3599,
        scope: DRIVE_SCOPE,
        refresh_token: SECRET_REFRESH_TOKEN,
        id_token: idToken('a@example.com')
      })
    )

    const { response, body } = await exchange(env, fetchFn)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      access_token: 'access-1',
      expires_in: 3599,
      scope: DRIVE_SCOPE,
      email: 'a@example.com'
    })
    expect(isValidSessionId(body.sessionId)).toBe(true)
    expect(JSON.stringify(body)).not.toContain(SECRET_REFRESH_TOKEN)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)

    const stored = [...env.AUTH_KV.store.values()].join()

    expect(env.AUTH_KV.store.size).toBe(1)
    expect(stored).not.toContain(SECRET_REFRESH_TOKEN)

    const sent = new URLSearchParams(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )

    expect(sent.get('grant_type')).toBe('authorization_code')
    expect(sent.get('redirect_uri')).toBe('postmessage')
    expect(sent.get('client_secret')).toBe('client-secret')
  })

  it('returns no session id when Google sends no refresh token', async () => {
    const env = makeEnv()

    const { response, body } = await exchange(
      env,
      vi.fn(async () => googleReply({ access_token: 'access-1', expires_in: 3600, scope: 's' }))
    )

    expect(response.status).toBe(200)
    expect(body.sessionId).toBeUndefined()
    expect(env.AUTH_KV.store.size).toBe(0)
  })

  it('retries the exchange with the page origin after a redirect_uri mismatch', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(googleReply({ error: 'redirect_uri_mismatch' }, 400))
      .mockResolvedValueOnce(
        googleReply({ access_token: 'a', scope: DRIVE_SCOPE, refresh_token: 'r' })
      )

    const { response } = await exchange(makeEnv(), fetchFn)

    const second = new URLSearchParams(
      (fetchFn.mock.calls[1] as [string, RequestInit])[1].body as string
    )

    expect(response.status).toBe(200)
    expect(second.get('redirect_uri')).toBe(ORIGIN)
  })

  it('maps an expired code to 400 and an unreachable Google to 502', async () => {
    const expired = await exchange(
      makeEnv(),
      vi.fn(async () => googleReply({ error: 'invalid_grant' }, 400))
    )

    const down = await exchange(
      makeEnv(),
      vi.fn(async () => {
        throw new Error('offline')
      })
    )

    expect(expired.response.status).toBe(400)
    expect(expired.body.error).toBe('invalid_grant')
    expect(down.response.status).toBe(502)
  })

  it('renews an access token with the stored refresh token', async () => {
    const env = makeEnv()

    const { body } = await exchange(
      env,
      vi.fn(async () =>
        googleReply({ access_token: 'a', scope: DRIVE_SCOPE, refresh_token: SECRET_REFRESH_TOKEN })
      )
    )

    const fetchFn = vi.fn(async () =>
      googleReply({ access_token: 'access-2', expires_in: 3599, scope: 'openid email' })
    )

    const response = await handleRequest(
      post('/refresh', { sessionId: body.sessionId }),
      env,
      fetchFn
    )

    const sent = new URLSearchParams(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      access_token: 'access-2',
      expires_in: 3599,
      scope: 'openid email'
    })
    expect(sent.get('grant_type')).toBe('refresh_token')
    expect(sent.get('refresh_token')).toBe(SECRET_REFRESH_TOKEN)
  })

  it('answers 401 invalid_grant and forgets the session when Google refuses the refresh token', async () => {
    const env = makeEnv()

    const { body } = await exchange(
      env,
      vi.fn(async () => googleReply({ access_token: 'a', scope: DRIVE_SCOPE, refresh_token: 'r' }))
    )

    const response = await handleRequest(
      post('/refresh', { sessionId: body.sessionId }),
      env,
      vi.fn(async () => googleReply({ error: 'invalid_grant' }, 400))
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'invalid_grant' })
    expect(env.AUTH_KV.store.size).toBe(0)
  })

  it('keeps the session when Google is down so the client can retry', async () => {
    const env = makeEnv()

    const { body } = await exchange(
      env,
      vi.fn(async () => googleReply({ access_token: 'a', scope: DRIVE_SCOPE, refresh_token: 'r' }))
    )

    const response = await handleRequest(
      post('/refresh', { sessionId: body.sessionId }),
      env,
      vi.fn(async () => googleReply({}, 503))
    )

    expect(response.status).toBe(502)
    expect(env.AUTH_KV.store.size).toBe(1)
  })

  it('answers 401 for an unknown session and 400 for a malformed id', async () => {
    const env = makeEnv()

    const unknown = await handleRequest(
      post('/refresh', { sessionId: newSessionId() }),
      env,
      vi.fn()
    )

    const malformed = await handleRequest(post('/refresh', { sessionId: '../../x' }), env, vi.fn())

    expect(unknown.status).toBe(401)
    expect(malformed.status).toBe(400)
  })

  it('reports a replaced encryption key as misconfigured and keeps the entries', async () => {
    const env = makeEnv()

    const { body } = await exchange(
      env,
      vi.fn(async () => googleReply({ access_token: 'a', scope: DRIVE_SCOPE, refresh_token: 'r' }))
    )

    const response = await handleRequest(
      post('/refresh', { sessionId: body.sessionId }),
      { ...env, TOKEN_ENC_KEY: OTHER_KEY_B64 },
      vi.fn()
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'misconfigured' })
    // Deleting would turn one wrong key into everybody's sign-out.
    expect(env.AUTH_KV.store.size).toBe(1)
  })

  it('revokes the refresh token and forgets the session on logout', async () => {
    const env = makeEnv()

    const { body } = await exchange(
      env,
      vi.fn(async () =>
        googleReply({ access_token: 'a', scope: DRIVE_SCOPE, refresh_token: SECRET_REFRESH_TOKEN })
      )
    )

    const fetchFn = vi.fn(async () => googleReply({}))

    const response = await handleRequest(
      post('/logout', { sessionId: body.sessionId }),
      env,
      fetchFn
    )

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]

    expect(response.status).toBe(200)
    expect(url).toBe('https://oauth2.googleapis.com/revoke')
    expect(new URLSearchParams(init.body as string).get('token')).toBe(SECRET_REFRESH_TOKEN)
    expect(env.AUTH_KV.store.size).toBe(0)
  })

  it('rejects oversized bodies, wrong methods and unknown paths', async () => {
    const env = makeEnv()

    const big = await handleRequest(post('/exchange', { code: 'x'.repeat(5000) }), env, vi.fn())

    const wrongMethod = await handleRequest(
      new Request('https://auth.example.workers.dev/refresh', {
        method: 'GET',
        headers: { Origin: ORIGIN }
      }),
      env,
      vi.fn()
    )

    const unknownPath = await handleRequest(post('/other', {}), env, vi.fn())

    expect(big.status).toBe(413)
    expect(wrongMethod.status).toBe(405)
    expect(unknownPath.status).toBe(404)
  })

  it('answers 500 without detail when the encryption key is missing', async () => {
    const env = makeEnv()

    const response = await handleRequest(
      post('/exchange', { code: 'c' }),
      { ...env, TOKEN_ENC_KEY: '' },
      vi.fn()
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'misconfigured' })
  })
})
