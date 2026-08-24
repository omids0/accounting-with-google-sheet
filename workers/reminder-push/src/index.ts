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

import { buildPushHTTPRequest } from '@pushforge/builder';

interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SendRequestBody {
  title: string;
  body: string;
  url?: string;
  subscriptions: PushSubscriptionPayload[];
}

interface Env {
  VAPID_PRIVATE_JWK: string;
  PUSH_WORKER_SECRET: string;
  VAPID_CONTACT?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return !!env.PUSH_WORKER_SECRET && token === env.PUSH_WORKER_SECRET;
}

async function sendOne(
  env: Env,
  subscription: PushSubscriptionPayload,
  payload: { title: string; body: string; url?: string }
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const privateJWK = JSON.parse(env.VAPID_PRIVATE_JWK);
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK,
      subscription,
      message: {
        payload: {
          title: payload.title,
          body: payload.body,
          url: payload.url ?? '/',
        },
        adminContact: env.VAPID_CONTACT ?? 'mailto:admin@example.com',
        options: {
          ttl: 86400,
          urgency: 'normal',
        },
      },
    });

    const response = await fetch(endpoint, { method: 'POST', headers, body });
    if (!response.ok) {
      return { ok: false, status: response.status, error: await response.text() };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    if (!isAuthorized(request, env)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    let body: SendRequestBody;
    try {
      body = (await request.json()) as SendRequestBody;
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    if (!body?.title || !body?.body || !Array.isArray(body.subscriptions)) {
      return json({ error: 'Missing title/body/subscriptions' }, 400);
    }

    const results = await Promise.all(
      body.subscriptions.map(async (subscription) => ({
        endpoint: subscription.endpoint,
        result: await sendOne(env, subscription, body),
      }))
    );

    const sent = results.filter((item) => item.result.ok).length;
    return json({ sent, total: results.length, results });
  },
};
