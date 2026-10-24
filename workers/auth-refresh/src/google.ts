/** The three calls to Google's OAuth server. Nothing here logs a token. */

export const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

export interface GoogleCredentials {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

export interface GoogleTokenData {
  access_token?: string
  expires_in?: number
  scope?: string
  refresh_token?: string
  id_token?: string
}

/** `status` 0 means Google could not be reached at all. */
export type GoogleResult =
  | { ok: true; data: GoogleTokenData }
  | { ok: false; status: number; error: string }

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

async function postForm(
  url: string,
  params: Record<string, string>,
  fetchFn: FetchLike
): Promise<GoogleResult> {
  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    })

    const body = (await response.json().catch(() => ({}))) as GoogleTokenData & { error?: unknown }

    if (response.ok) return { ok: true, data: body }

    return {
      ok: false,
      status: response.status,
      error: typeof body.error === 'string' ? body.error : 'upstream'
    }
  } catch {
    return { ok: false, status: 0, error: 'network' }
  }
}

export function exchangeCode(
  env: GoogleCredentials,
  code: string,
  redirectUri: string,
  fetchFn: FetchLike
): Promise<GoogleResult> {
  return postForm(
    TOKEN_URL,
    {
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    },
    fetchFn
  )
}

export function refreshAccessToken(
  env: GoogleCredentials,
  refreshToken: string,
  fetchFn: FetchLike
): Promise<GoogleResult> {
  return postForm(
    TOKEN_URL,
    {
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token'
    },
    fetchFn
  )
}

/** Best effort: a failed revoke must not keep the user signed in. */
export async function revokeRefreshToken(refreshToken: string, fetchFn: FetchLike): Promise<void> {
  await postForm(REVOKE_URL, { token: refreshToken }, fetchFn)
}
