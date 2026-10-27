/**
 * Invite links: each person gets a stable invite code, and a new person who signs in with
 * that code is counted once for the inviter.
 *
 * Nothing here stores an email. The code is a keyed hash (HMAC) of the inviter's email, the
 * "already counted" marker is a keyed hash of the invitee's email. The caller proves who
 * they are with their Google access token, which the worker checks against Google.
 */

import { fromBase64Url, toBase64Url } from './crypto'
import type { FetchLike } from './google'
import type { Env } from './handlers'
import { jsonResponse } from './http'

export const INVITE_ROUTES = ['/invite/code', '/invite/claim', '/invite/stats'] as const

const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

const CODE_LENGTH = 10

const HASH_LENGTH = 22

const MAX_TOKEN_LENGTH = 2048

/** A code is only ever produced by `inviteCode`, so anything else is rejected before KV. */
export const isValidInviteCode = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{10}$/.test(value)

/** Dev builds count in their own keys so test invitations never reach the real numbers. */
const keyPrefix = (dev: boolean) => (dev ? 'inv-dev:' : 'inv:')

const invitedKey = (dev: boolean, hash: string) => `${keyPrefix(dev)}u:${hash}`

const counterKey = (dev: boolean, code: string) => `${keyPrefix(dev)}n:${code}`

/** Domain separation: the same secret signs sessions elsewhere, so every message is labelled. */
async function keyedHash(secret: string, label: string, email: string, length: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64Url(secret.trim()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${label}:${email.trim().toLowerCase()}`)
  )

  return toBase64Url(new Uint8Array(mac)).slice(0, length)
}

export const inviteCode = (secret: string, email: string) =>
  keyedHash(secret, 'inviter', email, CODE_LENGTH)

const inviteeHash = (secret: string, email: string) =>
  keyedHash(secret, 'invitee', email, HASH_LENGTH)

/** The verified email behind an access token, or '' when Google does not vouch for it. */
async function verifiedEmail(accessToken: unknown, fetchFn: FetchLike): Promise<string> {
  if (typeof accessToken !== 'string' || !accessToken || accessToken.length > MAX_TOKEN_LENGTH) {
    return ''
  }

  try {
    const response = await fetchFn(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) return ''

    const info = (await response.json()) as { email?: unknown; email_verified?: unknown }

    return typeof info.email === 'string' && info.email_verified !== false ? info.email : ''
  } catch {
    return ''
  }
}

async function readCount(env: Env, key: string): Promise<number> {
  const count = Number(await env.AUTH_KV.get(key))

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

export type ClaimStatus = 'counted' | 'known' | 'self'

async function claim(
  env: Env,
  secret: string,
  email: string,
  ref: string,
  dev: boolean
): Promise<ClaimStatus> {
  if ((await inviteCode(secret, email)) === ref) return 'self'

  const hash = await inviteeHash(secret, email)

  if (await env.AUTH_KV.get(invitedKey(dev, hash))) return 'known'

  await env.AUTH_KV.put(invitedKey(dev, hash), JSON.stringify({ c: ref, t: Date.now() }))

  // KV has no atomic increment. Invitations are rare, so a lost update is possible only when
  // two people sign in for the same inviter within the same second or so.
  await env.AUTH_KV.put(
    counterKey(dev, ref),
    String((await readCount(env, counterKey(dev, ref))) + 1)
  )

  return 'counted'
}

export async function handleInvite(
  route: string,
  body: Record<string, unknown>,
  env: Env,
  origin: string,
  fetchFn: FetchLike
): Promise<Response> {
  const email = await verifiedEmail(body.accessToken, fetchFn)

  if (!email) return jsonResponse({ error: 'unauthorized' }, 401, origin)

  const secret = env.TOKEN_ENC_KEY ?? ''

  const dev = body.env === 'dev'

  const code = await inviteCode(secret, email)

  if (route === '/invite/code') return jsonResponse({ code }, 200, origin)

  if (route === '/invite/stats') {
    return jsonResponse({ code, count: await readCount(env, counterKey(dev, code)) }, 200, origin)
  }

  if (!isValidInviteCode(body.ref)) return jsonResponse({ error: 'bad_request' }, 400, origin)

  return jsonResponse({ status: await claim(env, secret, email, body.ref, dev) }, 200, origin)
}
