/** Logic of the three endpoints and the worker's environment. The router is in index.ts. */

import { newSessionId, openText, sealText } from './crypto'
import {
  exchangeCode,
  refreshAccessToken,
  revokeRefreshToken,
  type FetchLike,
  type GoogleCredentials,
  type GoogleResult
} from './google'
import { emailFromIdToken, jsonResponse } from './http'

/** The part of a KV namespace the worker uses (also what the unit tests fake). */
export interface KVLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

/** Cloudflare's Workers Rate Limiting binding (optional, see README). */
export interface RateLimiterLike {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface Env extends GoogleCredentials {
  AUTH_KV: KVLike
  RATE_LIMITER?: RateLimiterLike
  /** 32 random bytes, base64. */
  TOKEN_ENC_KEY: string
  /** Comma separated origins allowed to call the worker. */
  ALLOWED_ORIGINS?: string
}

/** A refresh token unused for this long is forgotten (Google's own limit is about six months). */
export const SESSION_TTL_SECONDS = 180 * 24 * 60 * 60

/** The KV entry is rewritten (its expiry pushed out) at most this often. */
export const TOUCH_AFTER_MS = 30 * 24 * 60 * 60 * 1000

const MAX_CODE_LENGTH = 2048

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

interface StoredSession {
  /** Sealed refresh token. */
  rt: string
  /** Last time the entry was written, ms. */
  t: number
}

const kvKey = (sessionId: string) => `s:${sessionId}`

type Failure = Extract<GoogleResult, { ok: false }>

const isUpstreamFailure = (result: Failure) =>
  result.status === 0 ||
  result.status >= 500 ||
  result.status === 429 ||
  result.error === 'upstream'

export async function handleExchange(
  body: Record<string, unknown>,
  env: Env,
  origin: string,
  fetchFn: FetchLike,
  key: CryptoKey
): Promise<Response> {
  const code = body.code

  if (typeof code !== 'string' || !code || code.length > MAX_CODE_LENGTH) {
    return jsonResponse({ error: 'bad_request' }, 400, origin)
  }

  // Google's popup flow normally exchanges with "postmessage"; some setups want the page origin.
  let result = await exchangeCode(env, code, 'postmessage', fetchFn)

  if (!result.ok && result.error === 'redirect_uri_mismatch') {
    result = await exchangeCode(env, code, origin, fetchFn)
  }

  if (!result.ok) {
    return isUpstreamFailure(result)
      ? jsonResponse({ error: 'upstream' }, 502, origin)
      : jsonResponse({ error: result.error }, 400, origin)
  }

  const { access_token, expires_in, scope, refresh_token, id_token } = result.data

  if (!access_token) return jsonResponse({ error: 'upstream' }, 502, origin)

  const reply: Record<string, unknown> = {
    access_token,
    expires_in: expires_in ?? 3600,
    scope: scope ?? '',
    email: emailFromIdToken(id_token)
  }

  // Google sends a refresh token only on the first consent. Without one (or when the
  // user left drive.file unticked, which the app cannot use) nothing is stored and the
  // reply has no sessionId, so the app keeps the old silent renewal.
  if (refresh_token && (scope ?? '').split(/\s+/).includes(DRIVE_FILE_SCOPE)) {
    const sessionId = newSessionId()

    const stored: StoredSession = {
      rt: await sealText(refresh_token, key, sessionId),
      t: Date.now()
    }

    await env.AUTH_KV.put(kvKey(sessionId), JSON.stringify(stored), {
      expirationTtl: SESSION_TTL_SECONDS
    })
    reply.sessionId = sessionId
  }

  return jsonResponse(reply, 200, origin)
}

type LoadedToken =
  | { kind: 'ok'; token: string; stored: StoredSession }
  /** No entry (KV is eventually consistent, so this may be a read that is just too early). */
  | { kind: 'missing' }
  /** An entry that cannot be opened: sealed with another key or damaged. */
  | { kind: 'unreadable' }

async function loadRefreshToken(env: Env, sessionId: string, key: CryptoKey): Promise<LoadedToken> {
  const raw = await env.AUTH_KV.get(kvKey(sessionId))

  if (!raw) return { kind: 'missing' }

  try {
    const stored = JSON.parse(raw) as StoredSession

    const token = await openText(stored.rt, key, sessionId)

    return token ? { kind: 'ok', token, stored } : { kind: 'unreadable' }
  } catch {
    return { kind: 'unreadable' }
  }
}

export async function handleRefresh(
  sessionId: string,
  env: Env,
  origin: string,
  fetchFn: FetchLike,
  key: CryptoKey
): Promise<Response> {
  const entry = await loadRefreshToken(env, sessionId, key)

  if (entry.kind === 'missing') return jsonResponse({ error: 'invalid_grant' }, 401, origin)

  if (entry.kind === 'unreadable') {
    await env.AUTH_KV.delete(kvKey(sessionId))

    return jsonResponse({ error: 'invalid_grant' }, 401, origin)
  }

  const result = await refreshAccessToken(env, entry.token, fetchFn)

  if (!result.ok) {
    if (result.error === 'invalid_grant') {
      await env.AUTH_KV.delete(kvKey(sessionId))

      return jsonResponse({ error: 'invalid_grant' }, 401, origin)
    }

    // Any other refusal (invalid_client, unauthorized_client, invalid_request ...) will
    // not fix itself: tell the app to drop the session instead of retrying for ever.
    // The entry stays, so fixing a wrong client secret revives nothing but loses nothing.
    return isUpstreamFailure(result)
      ? jsonResponse({ error: 'upstream' }, 502, origin)
      : jsonResponse({ error: 'fatal' }, 401, origin)
  }

  if (!result.data.access_token) return jsonResponse({ error: 'upstream' }, 502, origin)

  if (Date.now() - entry.stored.t > TOUCH_AFTER_MS) {
    // Pushing the expiry out is housekeeping; it must never fail a good renewal.
    try {
      await env.AUTH_KV.put(kvKey(sessionId), JSON.stringify({ ...entry.stored, t: Date.now() }), {
        expirationTtl: SESSION_TTL_SECONDS
      })
    } catch {
      /* the entry simply keeps its old expiry */
    }
  }

  return jsonResponse(
    {
      access_token: result.data.access_token,
      expires_in: result.data.expires_in ?? 3600,
      scope: result.data.scope ?? ''
    },
    200,
    origin
  )
}

export async function handleLogout(
  sessionId: string,
  revoke: boolean,
  env: Env,
  origin: string,
  fetchFn: FetchLike,
  key: CryptoKey
): Promise<Response> {
  // `revoke: false` only forgets the stored copy. Revoking at Google ends the whole grant,
  // which would also end a fresh sign-in of the same user.
  const entry = revoke ? await loadRefreshToken(env, sessionId, key) : null

  if (entry?.kind === 'ok') await revokeRefreshToken(entry.token, fetchFn)
  await env.AUTH_KV.delete(kvKey(sessionId))

  return jsonResponse({ ok: true }, 200, origin)
}
