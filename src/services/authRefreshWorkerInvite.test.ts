import { describe, expect, it, vi } from 'vitest'

import { googleReply, makeEnv, post } from './authRefreshWorkerKit'
import { handleRequest } from '../../workers/auth-refresh/src/index'

/** Google's userinfo answers by token: 'tok-ana' is ana@example.com and so on. */
function userinfo(extra: Record<string, unknown> = {}) {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const token = String((init.headers as Record<string, string>).Authorization).replace(
      'Bearer ',
      ''
    )

    if (!token.startsWith('tok-')) return googleReply({ error: 'invalid_token' }, 401)

    return googleReply({ email: `${token.slice(4)}@example.com`, email_verified: true, ...extra })
  })
}

const call = async (
  env: ReturnType<typeof makeEnv>,
  fetchFn: ReturnType<typeof userinfo>,
  route: string,
  body: Record<string, unknown>
) => {
  const response = await handleRequest(post(route, body), env, fetchFn)

  return { response, body: (await response.json()) as Record<string, unknown> }
}

const codeOf = async (
  env: ReturnType<typeof makeEnv>,
  fetchFn: ReturnType<typeof userinfo>,
  who: string
) => (await call(env, fetchFn, '/invite/code', { accessToken: `tok-${who}` })).body.code as string

describe('invite routes', () => {
  it('gives the same code to the same person and another to someone else', async () => {
    const env = makeEnv()

    const fetchFn = userinfo()

    const ana = await codeOf(env, fetchFn, 'ana')

    expect(ana).toMatch(/^[A-Za-z0-9_-]{10}$/)
    expect(await codeOf(env, fetchFn, 'ana')).toBe(ana)
    expect(await codeOf(env, fetchFn, 'bob')).not.toBe(ana)
  })

  it('does not put the email into the code or into KV', async () => {
    const env = makeEnv()

    const fetchFn = userinfo()

    const ref = await codeOf(env, fetchFn, 'ana')

    await call(env, fetchFn, '/invite/claim', { accessToken: 'tok-bob', ref })

    const stored = [...env.AUTH_KV.store.entries()].flat().join(' ')

    expect(stored).not.toContain('bob@example.com')
    expect(stored).not.toContain('ana@example.com')
    expect(ref).not.toContain('ana')
  })

  it('counts a new person once, however often they sign in', async () => {
    const env = makeEnv()

    const fetchFn = userinfo()

    const ref = await codeOf(env, fetchFn, 'ana')

    expect(
      (await call(env, fetchFn, '/invite/claim', { accessToken: 'tok-bob', ref })).body
    ).toEqual({
      status: 'counted'
    })
    expect(
      (await call(env, fetchFn, '/invite/claim', { accessToken: 'tok-bob', ref })).body
    ).toEqual({
      status: 'known'
    })
    await call(env, fetchFn, '/invite/claim', { accessToken: 'tok-cy', ref })

    expect((await call(env, fetchFn, '/invite/stats', { accessToken: 'tok-ana' })).body.count).toBe(
      2
    )
  })

  it('does not count someone who uses their own code', async () => {
    const env = makeEnv()

    const fetchFn = userinfo()

    const ref = await codeOf(env, fetchFn, 'ana')

    expect(
      (await call(env, fetchFn, '/invite/claim', { accessToken: 'tok-ana', ref })).body
    ).toEqual({
      status: 'self'
    })
    expect((await call(env, fetchFn, '/invite/stats', { accessToken: 'tok-ana' })).body.count).toBe(
      0
    )
  })

  it('counts a person for the first inviter only', async () => {
    const env = makeEnv()

    const fetchFn = userinfo()

    const ana = await codeOf(env, fetchFn, 'ana')

    const bob = await codeOf(env, fetchFn, 'bob')

    await call(env, fetchFn, '/invite/claim', { accessToken: 'tok-cy', ref: ana })
    await call(env, fetchFn, '/invite/claim', { accessToken: 'tok-cy', ref: bob })

    expect((await call(env, fetchFn, '/invite/stats', { accessToken: 'tok-bob' })).body.count).toBe(
      0
    )
  })

  it('keeps dev counts apart from the real ones', async () => {
    const env = makeEnv()

    const fetchFn = userinfo()

    const ref = await codeOf(env, fetchFn, 'ana')

    await call(env, fetchFn, '/invite/claim', { accessToken: 'tok-bob', ref, env: 'dev' })

    expect((await call(env, fetchFn, '/invite/stats', { accessToken: 'tok-ana' })).body.count).toBe(
      0
    )
    expect(
      (await call(env, fetchFn, '/invite/stats', { accessToken: 'tok-ana', env: 'dev' })).body.count
    ).toBe(1)
    expect([...env.AUTH_KV.store.keys()].every(key => key.startsWith('inv-dev:'))).toBe(true)
  })

  it('refuses a token Google does not accept or an unverified email', async () => {
    const env = makeEnv()

    expect(
      (await call(env, userinfo(), '/invite/code', { accessToken: 'nope' })).response.status
    ).toBe(401)
    expect(
      (
        await call(env, userinfo({ email_verified: false }), '/invite/code', {
          accessToken: 'tok-ana'
        })
      ).response.status
    ).toBe(401)
    expect((await call(env, userinfo(), '/invite/code', {})).response.status).toBe(401)
  })

  it('rejects a claim whose code could not have come from the worker', async () => {
    const env = makeEnv()

    const { response } = await call(env, userinfo(), '/invite/claim', {
      accessToken: 'tok-bob',
      ref: '../../s:abc'
    })

    expect(response.status).toBe(400)
    expect(env.AUTH_KV.store.size).toBe(0)
  })

  it('keeps the origin check of the other routes', async () => {
    const response = await handleRequest(
      post('/invite/code', { accessToken: 'tok-ana' }, 'https://evil.example'),
      makeEnv(),
      userinfo()
    )

    expect(response.status).toBe(403)
  })
})
