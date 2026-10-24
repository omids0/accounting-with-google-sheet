/**
 * Cloudflare Worker — renews Google access tokens for the accounting PWA.
 *
 * The browser sends a one-time authorization code to POST /exchange; the worker
 * trades it for tokens, keeps the refresh token sealed (AES-GCM) in KV under an
 * opaque session id and only ever returns access tokens. POST /refresh renews one
 * with that id, POST /logout revokes the refresh token and forgets the id.
 *
 * Deploy steps: see README.md.
 */

import { importEncryptionKey, isValidSessionId, newSessionId, openText, sealText } from './crypto'
import {
  exchangeCode,
  refreshAccessToken,
  revokeRefreshToken,
  type FetchLike,
  type GoogleCredentials,
  type GoogleResult
} from './google'
import {
  allowedOrigin,
  corsHeaders,
  emailFromIdToken,
  jsonResponse,
  parseAllowedOrigins,
  readJsonBody
} from './http'

/** The part of a KV namespace the worker uses (also what the unit tests fake). */
export interface KVLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

export interface Env extends GoogleCredentials {
  AUTH_KV: KVLike
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

interface StoredSession {
  /** Sealed refresh token. */
  rt: string
  /** Last time the entry was written, ms. */
  t: number
}

const kvKey = (sessionId: string) => `s:${sessionId}`

type Failure = Extract<GoogleResult, { ok: false }>

const isUpstreamFailure = (result: Failure) =>
  result.status === 0 || result.status >= 500 || result.error === 'upstream'

async function handleExchange(
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

  // Google sends a refresh token only on the first consent. Without one the app
  // keeps working with the old silent renewal, so the reply simply has no sessionId.
  if (refresh_token) {
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

async function loadRefreshToken(
  env: Env,
  sessionId: string,
  key: CryptoKey
): Promise<{ token: string; stored: StoredSession } | null> {
  const raw = await env.AUTH_KV.get(kvKey(sessionId))

  if (!raw) return null

  try {
    const stored = JSON.parse(raw) as StoredSession

    const token = await openText(stored.rt, key, sessionId)

    return token ? { token, stored } : null
  } catch {
    return null
  }
}

async function handleRefresh(
  sessionId: string,
  env: Env,
  origin: string,
  fetchFn: FetchLike,
  key: CryptoKey
): Promise<Response> {
  const entry = await loadRefreshToken(env, sessionId, key)

  if (!entry) {
    await env.AUTH_KV.delete(kvKey(sessionId))

    return jsonResponse({ error: 'invalid_grant' }, 401, origin)
  }

  const result = await refreshAccessToken(env, entry.token, fetchFn)

  if (!result.ok) {
    if (result.error === 'invalid_grant') {
      await env.AUTH_KV.delete(kvKey(sessionId))

      return jsonResponse({ error: 'invalid_grant' }, 401, origin)
    }

    return jsonResponse({ error: 'upstream' }, 502, origin)
  }

  if (!result.data.access_token) return jsonResponse({ error: 'upstream' }, 502, origin)

  if (Date.now() - entry.stored.t > TOUCH_AFTER_MS) {
    await env.AUTH_KV.put(kvKey(sessionId), JSON.stringify({ ...entry.stored, t: Date.now() }), {
      expirationTtl: SESSION_TTL_SECONDS
    })
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

async function handleLogout(
  sessionId: string,
  env: Env,
  origin: string,
  fetchFn: FetchLike,
  key: CryptoKey
): Promise<Response> {
  const entry = await loadRefreshToken(env, sessionId, key)

  if (entry) await revokeRefreshToken(entry.token, fetchFn)
  await env.AUTH_KV.delete(kvKey(sessionId))

  return jsonResponse({ ok: true }, 200, origin)
}

export async function handleRequest(
  request: Request,
  env: Env,
  fetchFn: FetchLike = (input, init) => fetch(input, init)
): Promise<Response> {
  const origin = allowedOrigin(request, parseAllowedOrigins(env.ALLOWED_ORIGINS))

  if (!origin) return jsonResponse({ error: 'forbidden' }, 403)

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  const route = new URL(request.url).pathname

  if (!['/exchange', '/refresh', '/logout'].includes(route)) {
    return jsonResponse({ error: 'not_found' }, 404, origin)
  }

  if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, origin)

  const body = await readJsonBody(request)

  if (!body.ok) return jsonResponse({ error: 'bad_request' }, body.status, origin)

  const sessionId = body.value.sessionId

  if (route !== '/exchange' && !isValidSessionId(sessionId)) {
    return jsonResponse({ error: 'bad_request' }, 400, origin)
  }

  try {
    const key = await importEncryptionKey(env.TOKEN_ENC_KEY ?? '')

    if (route === '/exchange') return await handleExchange(body.value, env, origin, fetchFn, key)

    if (route === '/refresh') {
      return await handleRefresh(sessionId as string, env, origin, fetchFn, key)
    }

    return await handleLogout(sessionId as string, env, origin, fetchFn, key)
  } catch {
    // No detail: errors here could carry a token or a secret.
    return jsonResponse({ error: 'server_error' }, 500, origin)
  }
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> => handleRequest(request, env)
}
