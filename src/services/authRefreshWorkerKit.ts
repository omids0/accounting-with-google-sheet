import { type vi } from 'vitest'

import { toBase64Url } from '../../workers/auth-refresh/src/crypto'
import { handleRequest, type Env, type KVLike } from '../../workers/auth-refresh/src/index'

export const ORIGIN = 'https://omids0.github.io'

export const KEY_B64 = toBase64Url(new Uint8Array(32).fill(7))

export const OTHER_KEY_B64 = toBase64Url(new Uint8Array(32).fill(9))

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

export const SECRET_REFRESH_TOKEN = 'refresh-token-secret-value'

function fakeKv(): KVLike & { store: Map<string, string> } {
  const store = new Map<string, string>()

  return {
    store,
    get: async key => store.get(key) ?? null,
    put: async (key, value) => {
      store.set(key, value)
    },
    delete: async key => {
      store.delete(key)
    }
  }
}

export function makeEnv(): Env & { AUTH_KV: ReturnType<typeof fakeKv> } {
  return {
    AUTH_KV: fakeKv(),
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    TOKEN_ENC_KEY: KEY_B64,
    ALLOWED_ORIGINS: `http://localhost:5173, ${ORIGIN}/`
  }
}

export function post(path: string, body: unknown, origin: string | null = ORIGIN): Request {
  return new Request(`https://auth.example.workers.dev${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })
}

export const googleReply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export const idToken = (email: string) =>
  `h.${toBase64Url(new TextEncoder().encode(JSON.stringify({ email })))}.s`

export async function exchange(env: Env, fetchFn: ReturnType<typeof vi.fn>) {
  const response = await handleRequest(post('/exchange', { code: 'auth-code' }), env, fetchFn)

  return { response, body: (await response.json()) as Record<string, unknown> }
}
