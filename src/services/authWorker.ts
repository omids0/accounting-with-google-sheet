import { isNativePlatform } from './googleAuthNative'

/** One request to the worker gives up after this long; the caller decides about a retry. */
const REQUEST_TIMEOUT_MS = 8_000

/**
 * Address of the token-refresh worker (workers/auth-refresh), or '' when it is
 * not configured. Unset means the app behaves exactly as before.
 */
export function authWorkerUrl(): string {
  const url = (import.meta.env.VITE_AUTH_WORKER_URL ?? '').trim().replace(/\/+$/, '')

  return /^https?:\/\//.test(url) ? url : ''
}

/** The worker serves the browser only; the APK renews through its native plugin. */
export function isAuthWorkerEnabled(): boolean {
  return !!authWorkerUrl() && !isNativePlatform()
}

export interface WorkerGrant {
  access_token: string
  expires_in: number
  /** Space-separated scopes Google granted. */
  scope: string
  /** Missing when Google sent no refresh token; the session then renews the old way. */
  sessionId?: string
  email?: string
}

export type WorkerRefreshResult =
  | { status: 'ok'; accessToken: string; expiresIn: number; scope: string }
  /** The refresh token is gone or revoked: only a new sign-in helps. */
  | { status: 'invalid' }
  /** No usable answer (offline, timeout, worker or Google down): try again later. */
  | { status: 'transient' }

async function postJson(path: string, body: Record<string, string | boolean>): Promise<Response> {
  const controller = new AbortController()

  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(`${authWorkerUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

async function readJson<T>(response: Response): Promise<Partial<T>> {
  try {
    return (await response.json()) as Partial<T>
  } catch {
    return {}
  }
}

/** The worker could not be reached or is broken; the caller may fall back to the token sign-in. */
export class AuthWorkerUnavailableError extends Error {}

/** Trades the one-time code from Google's popup for an access token and a worker session. */
export async function exchangeAuthCode(code: string): Promise<WorkerGrant> {
  let response: Response

  try {
    response = await postJson('/exchange', { code })
  } catch {
    throw new AuthWorkerUnavailableError(
      'اتصال به سرور ورود برقرار نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.'
    )
  }

  const data = await readJson<WorkerGrant & { error: string }>(response)

  if (response.ok && data.access_token) {
    return {
      access_token: data.access_token,
      expires_in: data.expires_in ?? 3600,
      scope: data.scope ?? '',
      sessionId: data.sessionId,
      email: data.email
    }
  }

  if (data.error === 'invalid_grant') throw new Error('کد ورود منقضی شد. دوباره وارد شوید.')

  throw new AuthWorkerUnavailableError('سرور ورود پاسخ نداد. کمی بعد دوباره تلاش کنید.')
}

/** One renewal attempt; the caller retries a `transient` result with backoff. */
export async function refreshViaWorker(sessionId: string): Promise<WorkerRefreshResult> {
  let response: Response

  try {
    response = await postJson('/refresh', { sessionId })
  } catch {
    return { status: 'transient' }
  }

  const data = await readJson<{
    access_token: string
    expires_in: number
    scope: string
    error: string
  }>(response)

  // 401: the refresh token is gone (invalid_grant) or Google refuses the app's client
  // for good (fatal). A misconfigured worker will not fix itself either. All three mean
  // this session cannot be renewed this way.
  if (response.status === 401 || data.error === 'misconfigured') return { status: 'invalid' }

  if (!response.ok || !data.access_token) return { status: 'transient' }

  return {
    status: 'ok',
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
    scope: data.scope ?? ''
  }
}

/**
 * Asks the worker to revoke the refresh token at Google and forget it. Best effort:
 * never throws. `revoke: false` only forgets the stored copy, for when the same user
 * signs in again and revoking would also end the fresh grant.
 */
export async function logoutViaWorker(sessionId: string, revoke = true): Promise<void> {
  try {
    await postJson('/logout', revoke ? { sessionId } : { sessionId, revoke: false })
  } catch {
    // Local sign-out must not depend on the network.
  }
}

/** Drops the worker's stored copy of a session without revoking anything at Google. */
export const forgetWorkerSession = (sessionId: string) => logoutViaWorker(sessionId, false)
