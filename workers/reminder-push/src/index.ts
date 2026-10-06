/**
 * Cloudflare Worker — relay رایگان برای Web Push
 *
 * Deploy:
 *   cd workers/reminder-push
 *   npm install
 *   npx wrangler secret put VAPID_PRIVATE_JWK
 *   npx wrangler secret put PUSH_WORKER_SECRET
 *   npm run deploy
 *
 * VAPID keys: npx @pushforge/builder vapid
 * - publicKey -> VITE_VAPID_PUBLIC_KEY در اپ
 * - privateJWK -> wrangler secret (کل JSON یک خط)
 */

import { buildPushHTTPRequest } from '@pushforge/builder'

interface PushSubscriptionPayload {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface SendRequestBody {
  title: string
  body: string
  url?: string
  subscriptions: PushSubscriptionPayload[]
}

interface Env {
  VAPID_PRIVATE_JWK: string
  PUSH_WORKER_SECRET: string
  VAPID_CONTACT?: string
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}

const MAX_SUBSCRIPTIONS = 20

const ALLOWED_PUSH_HOSTS = ['fcm.googleapis.com', 'web.push.apple.com']

const ALLOWED_PUSH_HOST_SUFFIXES = ['.push.services.mozilla.com', '.notify.windows.com']

/**
 * Compares SHA-256 digests byte by byte without early exit, so neither the
 * secret's content nor its length leaks through response timing.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b))
  ])
  const x = new Uint8Array(left)
  const y = new Uint8Array(right)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  if (!env.PUSH_WORKER_SECRET) return false
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  return timingSafeEqual(token, env.PUSH_WORKER_SECRET)
}

/** Only real push services may be called, so the worker cannot be used as an open relay. */
function isAllowedEndpoint(endpoint: unknown): boolean {
  if (typeof endpoint !== 'string') return false
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  return (
    ALLOWED_PUSH_HOSTS.includes(host) ||
    ALLOWED_PUSH_HOST_SUFFIXES.some(suffix => host.endsWith(suffix))
  )
}

function isValidSubscription(value: unknown): value is PushSubscriptionPayload {
  const sub = value as PushSubscriptionPayload | null
  return (
    !!sub &&
    isAllowedEndpoint(sub.endpoint) &&
    typeof sub.keys?.p256dh === 'string' &&
    typeof sub.keys?.auth === 'string'
  )
}

async function sendOne(
  env: Env,
  subscription: PushSubscriptionPayload,
  payload: { title: string; body: string; url?: string }
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const privateJWK = JSON.parse(env.VAPID_PRIVATE_JWK)
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK,
      subscription,
      message: {
        payload: {
          title: payload.title,
          body: payload.body,
          url: payload.url ?? '/'
        },
        adminContact: env.VAPID_CONTACT ?? 'mailto:admin@example.com',
        options: {
          ttl: 86400,
          urgency: 'normal'
        }
      }
    })

    const response = await fetch(endpoint, { method: 'POST', headers, body })
    if (!response.ok) {
      // The push service's body can carry internal detail; the status is enough to act on.
      return { ok: false, status: response.status, error: 'Push service rejected the message' }
    }
    return { ok: true, status: response.status }
  } catch {
    return { ok: false, error: 'Push send failed' }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type'
        }
      })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    if (!(await isAuthorized(request, env))) {
      return json({ error: 'Unauthorized' }, 401)
    }

    let body: SendRequestBody
    try {
      body = (await request.json()) as SendRequestBody
    } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }

    if (!body?.title || !body?.body || !Array.isArray(body.subscriptions)) {
      return json({ error: 'Missing title/body/subscriptions' }, 400)
    }

    // Rows are appended over time, so the newest subscriptions are kept when capping.
    const capped = body.subscriptions.slice(-MAX_SUBSCRIPTIONS)
    const dropped = body.subscriptions.length - capped.length

    const results = await Promise.all(
      capped.map(async (subscription: unknown) => {
        const endpoint = (subscription as PushSubscriptionPayload | null)?.endpoint
        if (!isValidSubscription(subscription)) {
          return {
            endpoint: typeof endpoint === 'string' ? endpoint : '',
            result: { ok: false, error: 'Endpoint not allowed' }
          }
        }
        return { endpoint: subscription.endpoint, result: await sendOne(env, subscription, body) }
      })
    )

    const sent = results.filter(item => item.result.ok).length
    return json({ sent, total: results.length, dropped, results })
  }
}
