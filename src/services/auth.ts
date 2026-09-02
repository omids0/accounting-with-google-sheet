import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage'
import type { GoogleSession } from '../types'

export const GOOGLE_OAUTH_SCOPE =
  'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly'

/** Must match @react-oauth/google implicit-flow scope prefix. */
export const FULL_GOOGLE_OAUTH_SCOPE = `openid profile email ${GOOGLE_OAUTH_SCOPE}`

/** Refresh access token this long before Google expiry. */
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60_000

export function saveSession(session: GoogleSession): void {
  setItem(STORAGE_KEYS.SESSION, session)
}

export function getSession(): GoogleSession | null {
  return getItem<GoogleSession>(STORAGE_KEYS.SESSION)
}

/** Small grace for clock skew; proactive refresh runs at TOKEN_REFRESH_BUFFER_MS. */
const TOKEN_VALIDITY_GRACE_MS = 5_000

export function isTokenValid(): boolean {
  const session = getSession()

  if (!session?.accessToken || !session?.tokenExpiry) return false

  return Date.now() < session.tokenExpiry - TOKEN_VALIDITY_GRACE_MS
}

export function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)

  return /منقضی|401|invalid credentials|unauthenticated|invalid_grant/i.test(msg)
}

export function hasStoredSession(): boolean {
  const session = getSession()

  return !!(session?.email && session?.accessToken)
}

export function shouldRefreshToken(): boolean {
  const session = getSession()

  if (!session?.accessToken || !session?.tokenExpiry) return false

  return Date.now() >= session.tokenExpiry - TOKEN_REFRESH_BUFFER_MS
}

export function getMsUntilTokenRefresh(): number | null {
  const session = getSession()

  if (!session?.tokenExpiry) return null

  return Math.max(0, session.tokenExpiry - TOKEN_REFRESH_BUFFER_MS - Date.now())
}

export function renewSessionToken(accessToken: string, expiresIn = 3600): void {
  const session = getSession()

  if (!session) return
  saveSession({
    ...session,
    accessToken,
    tokenExpiry: Date.now() + expiresIn * 1000
  })
}

export function getAccessToken(): string {
  const session = getSession()

  if (!session?.accessToken || !isTokenValid()) {
    throw new Error('نشست منقضی شده. دوباره وارد شوید')
  }

  return session.accessToken
}

export function getUserName(): string | null {
  const session = getSession()

  return session?.name || session?.email || null
}

export function getUserEmail(): string | null {
  return getSession()?.email ?? null
}

export function getUserPicture(): string | null {
  return getSession()?.picture ?? null
}

export async function fetchUserProfile(accessToken: string): Promise<{
  email: string
  name: string
  picture?: string
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!res.ok) throw new Error('دریافت اطلاعات کاربر ناموفق بود')

  const data = (await res.json()) as {
    email?: string
    name?: string
    picture?: string
  }

  return {
    email: data.email ?? '',
    name: data.name || data.email || '',
    picture: data.picture
  }
}

export function createSession(
  accessToken: string,
  profile: { email: string; name: string; picture?: string },
  expiresIn = 3600
): GoogleSession {
  return {
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    accessToken,
    tokenExpiry: Date.now() + expiresIn * 1000
  }
}

export function logout(): void {
  removeItem(STORAGE_KEYS.SESSION)
}
