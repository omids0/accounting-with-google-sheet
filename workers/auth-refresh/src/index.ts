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

import { importEncryptionKey, isValidSessionId } from './crypto'
import type { FetchLike } from './google'
import { handleExchange, handleLogout, handleRefresh, type Env } from './handlers'
import { allowedOrigin, corsHeaders, jsonResponse, parseAllowedOrigins, readJsonBody } from './http'

export type { Env, KVLike, RateLimiterLike } from './handlers'

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

  if (env.RATE_LIMITER) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'

    const { success } = await env.RATE_LIMITER.limit({ key: `${ip}${route}` }).catch(() => ({
      success: true
    }))

    if (!success) return jsonResponse({ error: 'rate_limited' }, 429, origin)
  }

  let key: CryptoKey

  try {
    key = await importEncryptionKey(env.TOKEN_ENC_KEY ?? '')
  } catch {
    // The owner has not set TOKEN_ENC_KEY (or set a wrong one): the app must not retry for ever.
    return jsonResponse({ error: 'misconfigured' }, 500, origin)
  }

  try {
    if (route === '/exchange') return await handleExchange(body.value, env, origin, fetchFn, key)

    if (route === '/refresh') {
      return await handleRefresh(sessionId as string, env, origin, fetchFn, key)
    }

    return await handleLogout(
      sessionId as string,
      body.value.revoke !== false,
      env,
      origin,
      fetchFn,
      key
    )
  } catch {
    // No detail: errors here could carry a token or a secret.
    return jsonResponse({ error: 'server_error' }, 500, origin)
  }
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> => handleRequest(request, env)
}
